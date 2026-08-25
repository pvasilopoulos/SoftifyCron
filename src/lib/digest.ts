import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { sendTelegram } from "@/lib/telegram";
import { sendSlack } from "@/lib/slack";
import { parseChatIds, parseClockMinutes, parseEmails } from "@/lib/notify-policy";
import { smtpFromTenant } from "@/lib/tenant-notify";
import { localIsoDate, localMinutes } from "@/lib/holidays-gr";
import { currentOncall, mergeOncallEmails } from "@/lib/oncall";

export async function sendDueDigests(now = new Date()) {
  const tenants = await prisma.tenant.findMany({
    where: { digestEnabled: true },
  });
  let sent = 0;
  for (const tenant of tenants) {
    const clock = parseClockMinutes(tenant.digestHour);
    if (clock == null) continue;
    const minutes = localMinutes(now, tenant.timezone);
    if (Math.abs(minutes - clock) > 2) continue;
    const today = localIsoDate(now, tenant.timezone);
    if (tenant.digestLastDate === today) continue;

    const since = new Date(now.getTime() - 24 * 3_600_000);
    const [total, success, failed, slow] = await Promise.all([
      prisma.jobRun.count({ where: { tenantId: tenant.id, startedAt: { gte: since } } }),
      prisma.jobRun.count({
        where: { tenantId: tenant.id, startedAt: { gte: since }, status: "SUCCESS" },
      }),
      prisma.jobRun.findMany({
        where: {
          tenantId: tenant.id,
          startedAt: { gte: since },
          status: { in: ["FAILED", "TIMEOUT", "BLOCKED"] },
        },
        include: { job: { select: { name: true } } },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
      prisma.notifyDelivery.count({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: since },
          event: { contains: "slow" },
        },
      }),
    ]);
    const failCount = await prisma.jobRun.count({
      where: {
        tenantId: tenant.id,
        startedAt: { gte: since },
        status: { in: ["FAILED", "TIMEOUT", "BLOCKED"] },
      },
    });
    const rate = total === 0 ? "—" : `${Math.round((success / total) * 100)}%`;
    const oncall = tenant.oncallEnabled ? currentOncall(tenant.oncallRoster, tenant.timezone, now) : null;
    const lines = [
      `SoftifyCron digest · ${tenant.name}`,
      oncall ? `On-call: ${oncall}` : null,
      `Last 24h: ${total} runs · ${rate} success · ${failCount} failed · ${slow} slow`,
      ...failed.map((run) => `- ${run.job.name} ${run.status}${run.error ? ` · ${run.error}` : ""}`),
    ].filter(Boolean) as string[];
    const text = lines.join("\n");
    const subject = `[SoftifyCron] Daily digest · ${tenant.name}`;

    const smtp = smtpFromTenant(tenant);
    const emails = mergeOncallEmails(parseEmails(tenant.notifyEmail), oncall);
    if (smtp && emails.length) {
      await sendMail({ to: emails, subject, text }, smtp);
    }
    const chats = parseChatIds(tenant.telegramChatId);
    if (tenant.telegramBotTokenEnc && chats.length) {
      const bot = decryptSecret(tenant.telegramBotTokenEnc);
      for (const chat of chats) {
        await sendTelegram(bot, chat, `${subject}\n${text}`);
      }
    }
    if (tenant.slackWebhookEnc) {
      await sendSlack(decryptSecret(tenant.slackWebhookEnc), `${subject}\n${text}`);
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { digestLastDate: today },
    });
    sent += 1;
  }
  return sent;
}
