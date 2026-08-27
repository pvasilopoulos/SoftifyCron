import { NextResponse } from "next/server";
import { portalMagicSchema } from "@/lib/validators";
import { findPortalClientByEmail } from "@/lib/portal";
import { signPortalMagic } from "@/lib/portal-magic";
import { jsonError, zodError } from "@/lib/http";
import { sendMail, envSmtp, mailConfigured } from "@/lib/mail";
import { smtpFromTenant } from "@/lib/tenant-notify";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";
import { clientIp } from "@/lib/allowlist";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request.headers) || "anon";
  if (!rateLimit(`portal-magic:${ip}`, 5, 15 * 60_000)) {
    return jsonError("Try again later", 429);
  }
  const body = await request.json().catch(() => null);
  const parsed = portalMagicSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const email = parsed.data.email.trim().toLowerCase();
  const client = await findPortalClientByEmail(email);
  if (client) {
    const tenant = await prisma.tenant.findUnique({ where: { id: client.tenantId } });
    const smtp = tenant ? smtpFromTenant(tenant) : envSmtp();
    if (mailConfigured(smtp)) {
      const token = signPortalMagic(client.id, email);
      const link = `${appUrl()}/portal/go/${encodeURIComponent(token)}`;
      try {
        await sendMail(
          {
            to: email,
            subject: `${client.tenant.name} client portal`,
            text: [
              `Your ${client.tenant.name} portal link for ${client.name}:`,
              link,
              "",
              "This link expires in 24 hours. It does not include the long-lived magic URL.",
            ].join("\n"),
          },
          smtp,
        );
      } catch (error) {
        console.error("[portal-magic] send failed", error);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
