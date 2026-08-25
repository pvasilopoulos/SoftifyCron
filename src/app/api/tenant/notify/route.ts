import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyTestSchema, tenantNotifySchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { envSmtp, sendMail } from "@/lib/mail";
import { looksLikeTelegramToken, sendTelegram } from "@/lib/telegram";
import { Prisma } from "@prisma/client";

function publicNotify(tenant: {
  notifyEmail: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPassEnc: string | null;
  telegramChatId: string | null;
  telegramBotTokenEnc: string | null;
}) {
  return {
    notifyEmail: tenant.notifyEmail ?? "",
    smtpHost: tenant.smtpHost ?? "",
    smtpPort: tenant.smtpPort,
    smtpSecure: tenant.smtpSecure,
    smtpUser: tenant.smtpUser ?? "",
    smtpFrom: tenant.smtpFrom ?? "",
    smtpHasPassword: Boolean(tenant.smtpPassEnc),
    telegramChatId: tenant.telegramChatId ?? "",
    telegramHasToken: Boolean(tenant.telegramBotTokenEnc),
    envSmtp: Boolean(envSmtp()),
  };
}

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  if (!tenant) return jsonError("Workspace not found", 404);
  return NextResponse.json({ notify: publicNotify(tenant) });
}

export async function PUT(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = tenantNotifySchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const existing = await prisma.tenant.findUnique({ where: { id: session.tid } });
  if (!existing) return jsonError("Workspace not found", 404);

  const token = parsed.data.telegramBotToken?.trim() ?? "";
  if (token && !looksLikeTelegramToken(token)) {
    return jsonError("Telegram bot token looks invalid", 422);
  }

  const data: Prisma.TenantUpdateInput = {
    notifyEmail: parsed.data.notifyEmail?.trim() ? parsed.data.notifyEmail.trim() : null,
    smtpHost: parsed.data.smtpHost?.trim() ? parsed.data.smtpHost.trim() : null,
    smtpPort: parsed.data.smtpPort ?? existing.smtpPort,
    smtpSecure: parsed.data.smtpSecure ?? existing.smtpSecure,
    smtpUser: parsed.data.smtpUser?.trim() ? parsed.data.smtpUser.trim() : null,
    smtpFrom: parsed.data.smtpFrom?.trim() ? parsed.data.smtpFrom.trim() : null,
    telegramChatId: parsed.data.telegramChatId?.trim() ? parsed.data.telegramChatId.trim() : null,
  };
  if (parsed.data.smtpPass?.trim()) {
    data.smtpPassEnc = encryptSecret(parsed.data.smtpPass.trim());
  }
  if (!parsed.data.smtpHost?.trim()) {
    data.smtpPassEnc = null;
  }
  if (parsed.data.clearTelegramToken) {
    data.telegramBotTokenEnc = null;
  } else if (token) {
    data.telegramBotTokenEnc = encryptSecret(token);
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.tid },
    data,
  });
  return NextResponse.json({ notify: publicNotify(tenant) });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }
  const body = await request.json().catch(() => null);
  const parsed = notifyTestSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  if (!tenant) return jsonError("Workspace not found", 404);

  if (parsed.data.channel === "email") {
    if (!tenant.notifyEmail) return jsonError("Set an alert email first", 400);
    let smtp = envSmtp();
    if (tenant.smtpHost && tenant.smtpFrom) {
      smtp = {
        host: tenant.smtpHost,
        port: tenant.smtpPort,
        secure: tenant.smtpSecure,
        user: tenant.smtpUser,
        pass: tenant.smtpPassEnc ? decryptSecret(tenant.smtpPassEnc) : null,
        from: tenant.smtpFrom,
      };
    }
    try {
      const result = await sendMail(
        {
          to: tenant.notifyEmail,
          subject: "[SoftifyCron] Test email",
          text: `This is a test from ${tenant.name}. Job alerts will use this mailbox.`,
        },
        smtp,
      );
      return NextResponse.json({
        ok: true,
        sent: result.sent,
        logged: !result.sent,
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Could not send test email", 400);
    }
  }

  if (!tenant.telegramBotTokenEnc || !tenant.telegramChatId) {
    return jsonError("Save a Telegram bot token and chat id first", 400);
  }
  try {
    await sendTelegram(
      decryptSecret(tenant.telegramBotTokenEnc),
      tenant.telegramChatId,
      `[SoftifyCron] Test from ${tenant.name}\nTelegram alerts are connected.`,
    );
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not send Telegram test", 400);
  }
}
