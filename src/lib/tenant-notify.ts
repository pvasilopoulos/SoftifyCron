import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret, randomToken } from "@/lib/crypto";
import { sendMail, type SmtpConfig } from "@/lib/mail";
import { looksLikeTelegramToken, sendTelegram } from "@/lib/telegram";
import { sendSlack } from "@/lib/slack";
import { assertSafeUrl } from "@/lib/ssrf";
import {
  DEFAULT_NOTIFY_EMAIL_ON,
  DEFAULT_NOTIFY_SLACK_ON,
  DEFAULT_NOTIFY_TELEGRAM_ON,
  DEFAULT_NOTIFY_WEBHOOK_ON,
  DEFAULT_QUIET_ALLOW,
  serializeNotifyList,
} from "@/lib/notify-events";
import {
  looksLikeSlackWebhook,
  parseChatIdsStrict,
  parseClockMinutes,
  parseEmailsStrict,
  parseSmtpPort,
} from "@/lib/notify-policy";
import { Prisma } from "@prisma/client";

export type TenantNotifyInput = {
  notifyEmail?: string;
  smtpHost?: string;
  smtpPort?: number | string | null;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  telegramChatId?: string;
  telegramBotToken?: string;
  clearTelegramToken?: boolean;
  slackWebhookUrl?: string;
  clearSlackWebhook?: boolean;
  rotateWebhookSecret?: boolean;
  defaultNotifyEmailOn?: string | string[];
  defaultNotifyTelegramOn?: string | string[];
  defaultNotifyWebhookOn?: string | string[];
  defaultNotifySlackOn?: string | string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursAllow?: string | string[];
  notifyCooldownSec?: number | string;
  runRetentionDays?: number | string;
  bodyKeepLast?: number | string;
  maxConcurrent?: number | string;
  catchUpMissed?: boolean;
  skipGreekHolidays?: boolean;
  escalateEmail?: string;
  escalateAfter?: number | string;
  statusPageEnabled?: boolean;
  statusPageSlug?: string;
};

export function smtpFromTenant(tenant: {
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

export function publicNotify(
  tenant: {
    notifyEmail: string | null;
    smtpHost: string | null;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpFrom: string | null;
    smtpPassEnc: string | null;
    telegramChatId: string | null;
    telegramBotTokenEnc: string | null;
    slackWebhookEnc: string | null;
    webhookSignEnc: string | null;
    defaultNotifyEmailOn?: string;
    defaultNotifyTelegramOn?: string;
    defaultNotifyWebhookOn?: string;
    defaultNotifySlackOn?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursAllow?: string;
    notifyCooldownSec?: number;
    runRetentionDays?: number;
    bodyKeepLast?: number;
    maxConcurrent?: number;
    catchUpMissed?: boolean;
    skipGreekHolidays?: boolean;
    escalateEmail?: string | null;
    escalateAfter?: number;
    statusPageEnabled?: boolean;
    statusPageSlug?: string | null;
  },
  extra?: { signingSecret?: string },
) {
  return {
    notifyEmail: tenant.notifyEmail ?? "",
    smtpHost: tenant.smtpHost ?? "",
    smtpPort: tenant.smtpPort || 587,
    smtpSecure: tenant.smtpSecure,
    smtpUser: tenant.smtpUser ?? "",
    smtpFrom: tenant.smtpFrom ?? "",
    smtpHasPassword: Boolean(tenant.smtpPassEnc),
    telegramChatId: tenant.telegramChatId ?? "",
    telegramHasToken: Boolean(tenant.telegramBotTokenEnc),
    slackHasWebhook: Boolean(tenant.slackWebhookEnc),
    hasSigningSecret: Boolean(tenant.webhookSignEnc),
    defaultNotifyEmailOn: tenant.defaultNotifyEmailOn ?? DEFAULT_NOTIFY_EMAIL_ON,
    defaultNotifyTelegramOn: tenant.defaultNotifyTelegramOn ?? DEFAULT_NOTIFY_TELEGRAM_ON,
    defaultNotifyWebhookOn: tenant.defaultNotifyWebhookOn ?? DEFAULT_NOTIFY_WEBHOOK_ON,
    defaultNotifySlackOn: tenant.defaultNotifySlackOn ?? DEFAULT_NOTIFY_SLACK_ON,
    quietHoursStart: tenant.quietHoursStart ?? "",
    quietHoursEnd: tenant.quietHoursEnd ?? "",
    quietHoursAllow: tenant.quietHoursAllow ?? DEFAULT_QUIET_ALLOW,
    notifyCooldownSec: tenant.notifyCooldownSec ?? 300,
    runRetentionDays: tenant.runRetentionDays ?? 30,
    bodyKeepLast: tenant.bodyKeepLast ?? 20,
    maxConcurrent: tenant.maxConcurrent ?? 4,
    catchUpMissed: Boolean(tenant.catchUpMissed),
    skipGreekHolidays: Boolean(tenant.skipGreekHolidays),
    escalateEmail: tenant.escalateEmail ?? "",
    escalateAfter: tenant.escalateAfter ?? 3,
    statusPageEnabled: Boolean(tenant.statusPageEnabled),
    statusPageSlug: tenant.statusPageSlug ?? "",
    signingSecret: extra?.signingSecret,
  };
}

export async function loadPublicNotify(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  return publicNotify(tenant);
}

export async function tenantNotifyDefaults(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      timezone: true,
      defaultNotifyEmailOn: true,
      defaultNotifyTelegramOn: true,
      defaultNotifyWebhookOn: true,
      defaultNotifySlackOn: true,
    },
  });
  return {
    timezone: tenant?.timezone ?? "Europe/Athens",
    notifyEmailOn: tenant?.defaultNotifyEmailOn ?? DEFAULT_NOTIFY_EMAIL_ON,
    notifyTelegramOn: tenant?.defaultNotifyTelegramOn ?? DEFAULT_NOTIFY_TELEGRAM_ON,
    notifyWebhookOn: tenant?.defaultNotifyWebhookOn ?? DEFAULT_NOTIFY_WEBHOOK_ON,
    notifySlackOn: tenant?.defaultNotifySlackOn ?? DEFAULT_NOTIFY_SLACK_ON,
  };
}

function clockOrEmpty(value: string | undefined, fallback: string) {
  const raw = value === undefined ? fallback : value.trim();
  if (!raw) return "";
  if (parseClockMinutes(raw) == null) throw new Error("Quiet hours must use HH:mm");
  return raw;
}

export async function updateTenantNotify(tenantId: string, input: TenantNotifyInput) {
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) return null;

  const emails = parseEmailsStrict(input.notifyEmail ?? existing.notifyEmail);
  const chats = parseChatIdsStrict(input.telegramChatId ?? existing.telegramChatId);
  const token = input.telegramBotToken?.trim() ?? "";
  if (token && !looksLikeTelegramToken(token)) {
    throw new Error("Telegram bot token looks invalid");
  }
  const slackUrl = input.slackWebhookUrl?.trim() ?? "";
  if (slackUrl) {
    if (!looksLikeSlackWebhook(slackUrl)) throw new Error("Slack webhook must be an https URL");
    await assertSafeUrl(slackUrl);
  }

  const cooldown =
    input.notifyCooldownSec == null
      ? existing.notifyCooldownSec
      : Math.min(86_400, Math.max(0, Math.trunc(Number(input.notifyCooldownSec) || 0)));

  const data: Prisma.TenantUpdateInput = {
    notifyEmail: emails.length ? emails.join(", ") : null,
    smtpHost: input.smtpHost?.trim() ? input.smtpHost.trim() : null,
    smtpPort: input.smtpPort == null || input.smtpPort === "" ? existing.smtpPort : parseSmtpPort(input.smtpPort),
    smtpSecure: input.smtpSecure ?? existing.smtpSecure,
    smtpUser: input.smtpUser?.trim() ? input.smtpUser.trim() : null,
    smtpFrom: input.smtpFrom?.trim() ? input.smtpFrom.trim() : null,
    telegramChatId: chats.length ? chats.join(", ") : null,
    defaultNotifyEmailOn: serializeNotifyList(
      input.defaultNotifyEmailOn ?? existing.defaultNotifyEmailOn,
    ),
    defaultNotifyTelegramOn: serializeNotifyList(
      input.defaultNotifyTelegramOn ?? existing.defaultNotifyTelegramOn,
    ),
    defaultNotifyWebhookOn: serializeNotifyList(
      input.defaultNotifyWebhookOn ?? existing.defaultNotifyWebhookOn,
    ),
    defaultNotifySlackOn: serializeNotifyList(
      input.defaultNotifySlackOn ?? existing.defaultNotifySlackOn,
    ),
    quietHoursStart: clockOrEmpty(input.quietHoursStart, existing.quietHoursStart),
    quietHoursEnd: clockOrEmpty(input.quietHoursEnd, existing.quietHoursEnd),
    quietHoursAllow: serializeNotifyList(input.quietHoursAllow ?? existing.quietHoursAllow),
    notifyCooldownSec: cooldown,
    runRetentionDays:
      input.runRetentionDays == null
        ? existing.runRetentionDays
        : Math.min(3650, Math.max(0, Math.trunc(Number(input.runRetentionDays) || 0))),
    bodyKeepLast:
      input.bodyKeepLast == null
        ? existing.bodyKeepLast
        : Math.min(500, Math.max(0, Math.trunc(Number(input.bodyKeepLast) || 0))),
    maxConcurrent:
      input.maxConcurrent == null
        ? existing.maxConcurrent
        : Math.min(25, Math.max(1, Math.trunc(Number(input.maxConcurrent) || 4))),
    catchUpMissed: input.catchUpMissed ?? existing.catchUpMissed,
    skipGreekHolidays: input.skipGreekHolidays ?? existing.skipGreekHolidays,
    escalateEmail: parseEmailsStrict(input.escalateEmail ?? existing.escalateEmail).join(", ") || null,
    escalateAfter:
      input.escalateAfter == null
        ? existing.escalateAfter
        : Math.min(100, Math.max(1, Math.trunc(Number(input.escalateAfter) || 3))),
    statusPageEnabled: input.statusPageEnabled ?? existing.statusPageEnabled,
    statusPageSlug: (() => {
      const enabled = input.statusPageEnabled ?? existing.statusPageEnabled;
      const raw = (input.statusPageSlug ?? existing.statusPageSlug ?? existing.slug).trim().toLowerCase();
      const slug = raw.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
      if (!enabled) return existing.statusPageSlug;
      return slug || existing.slug;
    })(),
  };
  if (input.smtpPass?.trim()) {
    data.smtpPassEnc = encryptSecret(input.smtpPass.trim());
  }
  if (!input.smtpHost?.trim()) {
    data.smtpPassEnc = null;
  }
  if (input.clearTelegramToken) {
    data.telegramBotTokenEnc = null;
  } else if (token) {
    data.telegramBotTokenEnc = encryptSecret(token);
  }
  if (input.clearSlackWebhook) {
    data.slackWebhookEnc = null;
  } else if (slackUrl) {
    data.slackWebhookEnc = encryptSecret(slackUrl);
  }

  if (data.statusPageSlug && typeof data.statusPageSlug === "string") {
    const taken = await prisma.tenant.findFirst({
      where: { statusPageSlug: data.statusPageSlug, NOT: { id: tenantId } },
      select: { id: true },
    });
    if (taken) throw new Error("That status page URL is already taken");
  }

  let signingSecret: string | undefined;
  if (input.rotateWebhookSecret || !existing.webhookSignEnc) {
    signingSecret = `whsec_${randomToken()}`;
    data.webhookSignEnc = encryptSecret(signingSecret);
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
    return publicNotify(tenant, { signingSecret });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That status page URL is already taken");
    }
    throw error;
  }
}

export async function testTenantNotify(
  tenantId: string,
  channel: "email" | "telegram" | "slack",
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Workspace not found");

  if (channel === "email") {
    const emails = parseEmailsStrict(tenant.notifyEmail);
    if (emails.length === 0) throw new Error("Set an alert email first");
    const smtp = smtpFromTenant(tenant);
    if (!smtp) throw new Error("Save this workspace SMTP host and from address first");
    const result = await sendMail(
      {
        to: emails,
        subject: `[SoftifyCron] Test email · ${tenant.name}`,
        text: `This is a test from ${tenant.name}. Job alerts for this workspace use this mailbox and SMTP.`,
      },
      smtp,
    );
    return { sent: result.sent, logged: !result.sent };
  }

  if (channel === "slack") {
    if (!tenant.slackWebhookEnc) throw new Error("Save a Slack incoming webhook for this workspace first");
    await sendSlack(
      decryptSecret(tenant.slackWebhookEnc),
      `[SoftifyCron] Test from ${tenant.name}\nSlack alerts stay inside this workspace.`,
    );
    return { sent: true, logged: false };
  }

  const chats = parseChatIdsStrict(tenant.telegramChatId);
  if (!tenant.telegramBotTokenEnc || chats.length === 0) {
    throw new Error("Save a Telegram bot token and chat id for this workspace first");
  }
  const bot = decryptSecret(tenant.telegramBotTokenEnc);
  for (const chat of chats) {
    await sendTelegram(
      bot,
      chat,
      `[SoftifyCron] Test from ${tenant.name}\nTelegram alerts stay inside this workspace.`,
    );
  }
  return { sent: true, logged: false };
}

export async function ensureWebhookSecret(tenantId: string, existingEnc: string | null) {
  if (existingEnc) return decryptSecret(existingEnc);
  const raw = `whsec_${randomToken()}`;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { webhookSignEnc: encryptSecret(raw) },
  });
  return raw;
}
