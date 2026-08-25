import { assertSafeUrl } from "@/lib/ssrf";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { sendTelegram } from "@/lib/telegram";
import { sendSlack } from "@/lib/slack";
import {
  channelMatches,
  eventsForRun,
  type NotifyChannel,
  type NotifyEvent,
} from "@/lib/notify-events";
import { applyQuietHours, parseChatIds, parseEmails } from "@/lib/notify-policy";
import { webhookSignatureHeader } from "@/lib/notify-sign";
import { ensureWebhookSecret, smtpFromTenant } from "@/lib/tenant-notify";

export type NotifyJob = {
  id: string;
  tenantId: string;
  name: string;
  notifyUrl: string | null;
  notifyEmailOn: string;
  notifyTelegramOn: string;
  notifyWebhookOn: string;
  notifySlackOn?: string;
  consecutiveFailures: number;
  lastStatus: string | null;
  error?: string | null;
  paused?: boolean;
  previousFailures?: number;
  httpStatus?: number | null;
};

function subjectFor(name: string, events: NotifyEvent[]) {
  if (events.includes("escalate")) return `[SoftifyCron] ${name} escalated`;
  if (events.includes("slow")) return `[SoftifyCron] ${name} ran slow`;
  if (events.includes("missed")) return `[SoftifyCron] ${name} missed a beat`;
  if (events.includes("pause")) return `[SoftifyCron] ${name} auto-paused`;
  if (events.includes("recovery")) return `[SoftifyCron] ${name} recovered`;
  if (events.includes("success")) return `[SoftifyCron] ${name} succeeded`;
  if (events.includes("timeout")) return `[SoftifyCron] ${name} timed out`;
  if (events.includes("blocked")) return `[SoftifyCron] ${name} blocked`;
  return `[SoftifyCron] ${name} failed`;
}

function webhookEventName(events: NotifyEvent[]) {
  if (events.includes("escalate")) return "job.escalated";
  if (events.includes("slow")) return "job.slow";
  if (events.includes("missed")) return "job.missed";
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

async function recordDelivery(input: {
  tenantId: string;
  jobId: string;
  runId?: string | null;
  channel: NotifyChannel;
  event: string;
  status: "sent" | "failed" | "skipped";
  detail?: string | null;
}) {
  try {
    await prisma.notifyDelivery.create({
      data: {
        tenantId: input.tenantId,
        jobId: input.jobId,
        runId: input.runId ?? null,
        channel: input.channel,
        event: input.event,
        status: input.status,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    console.error("[notify] delivery log failed", error);
  }
}

async function cooledDown(jobId: string, channel: NotifyChannel, cooldownSec: number) {
  if (cooldownSec <= 0) return false;
  const since = new Date(Date.now() - cooldownSec * 1000);
  const found = await prisma.notifyDelivery.findFirst({
    where: {
      jobId,
      channel,
      status: "sent",
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(found);
}

export async function notifyJob(
  job: NotifyJob,
  opts?: { events?: NotifyEvent[]; runId?: string | null; lateMs?: number },
) {
  const events =
    opts?.events ??
    eventsForRun({
      status: job.lastStatus ?? "FAILED",
      previousFailures: job.previousFailures ?? 0,
      paused: job.paused,
      lateMs: opts?.lateMs,
    });
  if (events.length === 0) return;

  const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
  if (!tenant) return;

  const liveEvents = applyQuietHours(events, {
    timeZone: tenant.timezone,
    start: tenant.quietHoursStart,
    end: tenant.quietHoursEnd,
    allow: tenant.quietHoursAllow,
  });
  const eventKey = events.join(",");
  const runId = opts?.runId ?? null;

  if (liveEvents.length === 0) {
    await recordDelivery({
      tenantId: job.tenantId,
      jobId: job.id,
      runId,
      channel: "email",
      event: eventKey,
      status: "skipped",
      detail: "quiet hours",
    });
    return;
  }

  const wantEmail = channelMatches(job.notifyEmailOn, liveEvents);
  const wantTelegram = channelMatches(job.notifyTelegramOn, liveEvents);
  const wantSlack = channelMatches(job.notifySlackOn, liveEvents);
  const wantWebhook = Boolean(job.notifyUrl) && channelMatches(job.notifyWebhookOn, liveEvents);
  if (!wantEmail && !wantTelegram && !wantSlack && !wantWebhook) return;

  const payload = {
    event: webhookEventName(liveEvents),
    events: liveEvents,
    jobId: job.id,
    tenantId: job.tenantId,
    name: job.name,
    status: job.lastStatus,
    httpStatus: job.httpStatus ?? null,
    consecutiveFailures: job.consecutiveFailures,
    error: job.error ?? null,
    paused: Boolean(job.paused),
  };
  const text = messageLines(job, tenant.name, liveEvents).join("\n");
  const subject = subjectFor(job.name, liveEvents);
  const cooldown = tenant.notifyCooldownSec ?? 300;

  async function sendChannel(channel: NotifyChannel, enabled: boolean, run: () => Promise<void>) {
    if (!enabled) return;
    if (await cooledDown(job.id, channel, cooldown)) {
      await recordDelivery({
        tenantId: job.tenantId,
        jobId: job.id,
        runId,
        channel,
        event: eventKey,
        status: "skipped",
        detail: `cooldown ${cooldown}s`,
      });
      return;
    }
    try {
      await run();
      await recordDelivery({
        tenantId: job.tenantId,
        jobId: job.id,
        runId,
        channel,
        event: eventKey,
        status: "sent",
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "send failed";
      console.error(`[notify] ${channel} failed`, job.id, error);
      await recordDelivery({
        tenantId: job.tenantId,
        jobId: job.id,
        runId,
        channel,
        event: eventKey,
        status: "failed",
        detail,
      });
    }
  }

  await sendChannel("webhook", wantWebhook, async () => {
    const url = job.notifyUrl;
    if (!url) throw new Error("Webhook URL missing");
    await assertSafeUrl(url);
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const secret = await ensureWebhookSecret(tenant.id, tenant.webhookSignEnc);
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "SoftifyCron/1.0",
        "x-softifycron-event": payload.event,
        "x-softifycron-timestamp": timestamp,
        "x-softifycron-signature": webhookSignatureHeader(secret, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
  });

  await sendChannel("email", wantEmail, async () => {
    const emails = parseEmails(tenant.notifyEmail);
    if (emails.length === 0) throw new Error("No alert email on this workspace");
    const smtp = smtpFromTenant(tenant);
    if (!smtp) throw new Error("Workspace SMTP is not configured");
    const result = await sendMail({ to: emails, subject, text }, smtp);
    if (!result.sent) throw new Error("Workspace SMTP is not configured");
  });

  await sendChannel("telegram", wantTelegram, async () => {
    const chats = parseChatIds(tenant.telegramChatId);
    if (!tenant.telegramBotTokenEnc || chats.length === 0) {
      throw new Error("Telegram is not configured on this workspace");
    }
    const bot = decryptSecret(tenant.telegramBotTokenEnc);
    for (const chat of chats) {
      await sendTelegram(bot, chat, `${subject}\n${text}`);
    }
  });

  await sendChannel("slack", wantSlack, async () => {
    if (!tenant.slackWebhookEnc) throw new Error("Slack is not configured on this workspace");
    await sendSlack(decryptSecret(tenant.slackWebhookEnc), `${subject}\n${text}`);
  });

  if (liveEvents.includes("escalate")) {
    const extra = parseEmails(tenant.escalateEmail);
    const smtp = smtpFromTenant(tenant);
    if (extra.length && smtp) {
      try {
        const result = await sendMail(
          { to: extra, subject, text: `${text}\n\nThis is an escalation copy.` },
          smtp,
        );
        await recordDelivery({
          tenantId: job.tenantId,
          jobId: job.id,
          runId,
          channel: "email",
          event: "escalate",
          status: result.sent ? "sent" : "failed",
          detail: result.sent ? "escalation copy" : "SMTP not configured",
        });
      } catch (error) {
        await recordDelivery({
          tenantId: job.tenantId,
          jobId: job.id,
          runId,
          channel: "email",
          event: "escalate",
          status: "failed",
          detail: error instanceof Error ? error.message : "escalation failed",
        });
      }
    }
  }
}

/** @deprecated use notifyJob */
export async function notifyFailure(job: NotifyJob) {
  return notifyJob(job);
}
