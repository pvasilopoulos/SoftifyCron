import { prisma } from "@/lib/prisma";
import { decryptSecret, hashToken } from "@/lib/crypto";
import { matchJobName, parseBotCommand } from "@/lib/bot-commands";
import { ackJob, snoozeJob } from "@/lib/jobs";
import { executeJob } from "@/lib/runner";

export async function tenantByBotSecret(kind: "telegram" | "slack", secret: string) {
  const want = secret.trim().toLowerCase();
  if (!want) return null;
  const tenants = await prisma.tenant.findMany({
    where: kind === "telegram" ? { telegramBotTokenEnc: { not: null } } : { slackWebhookEnc: { not: null } },
    select: { id: true, name: true, telegramBotTokenEnc: true, slackWebhookEnc: true },
  });
  for (const tenant of tenants) {
    const raw =
      kind === "telegram"
        ? tenant.telegramBotTokenEnc
          ? decryptSecret(tenant.telegramBotTokenEnc)
          : ""
        : tenant.slackWebhookEnc
          ? decryptSecret(tenant.slackWebhookEnc)
          : "";
    if (raw && hashToken(raw).toLowerCase() === want) return tenant;
  }
  return null;
}

export function botSecretHint(raw: string) {
  return hashToken(raw);
}

export async function runBotText(tenantId: string, text: string) {
  const command = parseBotCommand(text);
  if (!command) return { ok: false, message: "Unknown command. Use /ack, /run, or /snooze." };
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId },
    select: { id: true, name: true, tenantId: true },
    take: 200,
  });
  const job = matchJobName(jobs, command.query);
  if (!job) return { ok: false, message: `No unique job match for “${command.query}”.` };
  if (command.kind === "ack") {
    await ackJob(tenantId, job.id, { name: "bot", email: "bot" }, command.note ?? "");
    return { ok: true, message: `Acked ${job.name}` };
  }
  if (command.kind === "snooze") {
    await snoozeJob(tenantId, job.id, command.hours);
    return { ok: true, message: `Snoozed ${job.name} for ${command.hours}h` };
  }
  const full = await prisma.cronJob.findUnique({ where: { id: job.id } });
  if (!full) return { ok: false, message: "Job not found" };
  const result = await executeJob(full, "MANUAL");
  return { ok: true, message: `Ran ${job.name}: ${result.status}` };
}
