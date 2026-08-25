import { assertSafeUrl } from "@/lib/ssrf";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { sendMail, envSmtp, type SmtpConfig } from "@/lib/mail";
import { sendTelegram } from "@/lib/telegram";
import {
  channelMatches,
  eventsForRun,
  type NotifyEvent,
} from "@/lib/notify-events";

export type NotifyJob = {
  id: string;
  tenantId: string;
  name: string;
  notifyUrl: string | null;
  notifyEmailOn: string;
  notifyTelegramOn: string;
  notifyWebhookOn: string;
  consecutiveFailures: number;
  lastStatus: string | null;
  error?: string | null;
  paused?: boolean;
  previousFailures?: number;
  httpStatus?: number | null;
};

function tenantSmtp(tenant: {
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassEnc: string | null;
  smtpFrom: string | null;
}): SmtpConfig | null {
  const host = tenant.smtpHost?.trim();
  const from = tenant.smtpFrom?.trim();
  if (!host || !from) return null;
  let pass: string | null = null;
  if (tenant.smtpPassEnc) {
    try {
      pass = decryptSecret(tenant.smtpPassEnc);
    } catch (error) {
      console.error("[notify] could not decrypt SMTP password", error);
    }
  }
  return {
    host,
    port: tenant.smtpPort || 587,
    secure: tenant.smtpSecure,
    user: tenant.smtpUser,
    pass,
    from,
  };
}

function subjectFor(name: string, events: NotifyEvent[]) {
  if (events.includes("pause")) return `[SoftifyCron] ${name} auto-paused`;
  if (events.includes("recovery")) return `[SoftifyCron] ${name} recovered`;
  if (events.includes("success")) return `[SoftifyCron] ${name} succeeded`;
  if (events.includes("timeout")) return `[SoftifyCron] ${name} timed out`;
  if (events.includes("blocked")) return `[SoftifyCron] ${name} blocked`;
  return `[SoftifyCron] ${name} failed`;
}

function webhookEventName(events: NotifyEvent[]) {
  if (events.includes("pause")) return "job.paused";
  if (events.includes("recovery")) return "job.recovered";
  if (events.includes("success")) return "job.succeeded";
  if (events.includes("timeout")) return "job.timeout";
  if (events.includes("blocked")) return "job.blocked";
  return "job.failed";
}

function messageLines(job: NotifyJob, tenantName: string, events: NotifyEvent[]) {
  return [
    `Workspace: ${tenantName}`,
    `Job: ${job.name}`,
    `Events: ${events.join(", ")}`,
    `Status: ${job.lastStatus ?? "FAILED"}`,
    job.httpStatus != null ? `HTTP: ${job.httpStatus}` : null,
    `Consecutive failures: ${job.consecutiveFailures}`,
    job.paused ? "The job was auto-paused." : null,
    job.error ? `Error: ${job.error}` : null,
  ].filter(Boolean) as string[];
}

export async function notifyJob(job: NotifyJob) {
  const events = eventsForRun({
    status: job.lastStatus ?? "FAILED",
    previousFailures: job.previousFailures ?? 0,
    paused: job.paused,
  });
  if (events.length === 0) return;

  const wantEmail = channelMatches(job.notifyEmailOn, events);
  const wantTelegram = channelMatches(job.notifyTelegramOn, events);
  const wantWebhook = Boolean(job.notifyUrl) && channelMatches(job.notifyWebhookOn, events);
  if (!wantEmail && !wantTelegram && !wantWebhook) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: job.tenantId },
    select: {
      name: true,
      notifyEmail: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassEnc: true,
      smtpFrom: true,
      telegramBotTokenEnc: true,
      telegramChatId: true,
    },
  });
  if (!tenant) return;

  const payload = {
    event: webhookEventName(events),
    events,
    jobId: job.id,
    tenantId: job.tenantId,
    name: job.name,
    status: job.lastStatus,
    httpStatus: job.httpStatus ?? null,
    consecutiveFailures: job.consecutiveFailures,
    error: job.error ?? null,
    paused: Boolean(job.paused),
  };
  const text = messageLines(job, tenant.name, events).join("\n");

  if (wantWebhook && job.notifyUrl) {
    try {
      await assertSafeUrl(job.notifyUrl);
      await fetch(job.notifyUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "SoftifyCron/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      console.error("[notify] webhook failed", job.id, error);
    }
  }

  if (wantEmail && tenant.notifyEmail) {
    try {
      await sendMail(
        {
          to: tenant.notifyEmail,
          subject: subjectFor(job.name, events),
          text,
        },
        tenantSmtp(tenant) ?? envSmtp(),
      );
    } catch (error) {
      console.error("[notify] email failed", job.id, error);
    }
  }

  if (wantTelegram && tenant.telegramBotTokenEnc && tenant.telegramChatId) {
    try {
      const token = decryptSecret(tenant.telegramBotTokenEnc);
      await sendTelegram(token, tenant.telegramChatId, `${subjectFor(job.name, events)}\n${text}`);
    } catch (error) {
      console.error("[notify] telegram failed", job.id, error);
    }
  }
}

/** @deprecated use notifyJob */
export async function notifyFailure(job: NotifyJob) {
  return notifyJob(job);
}
