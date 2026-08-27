import { NextResponse } from "next/server";
import { portalMagicSchema } from "@/lib/validators";
import { findPortalClientByEmail } from "@/lib/portal";
import { signPortalMagic } from "@/lib/portal-magic";
import { zodError } from "@/lib/http";
import { sendMail, envSmtp } from "@/lib/mail";
import { smtpFromTenant } from "@/lib/tenant-notify";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = portalMagicSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const email = parsed.data.email.trim().toLowerCase();
  const client = await findPortalClientByEmail(email);
  if (client) {
    const token = signPortalMagic(client.id, email);
    const link = `${appUrl()}/portal/go/${encodeURIComponent(token)}`;
    const tenant = await prisma.tenant.findUnique({ where: { id: client.tenantId } });
    const smtp = tenant ? smtpFromTenant(tenant) : envSmtp();
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
  return NextResponse.json({ ok: true });
}
