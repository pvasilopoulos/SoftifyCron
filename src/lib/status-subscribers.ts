import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mail";
import { smtpFromTenant } from "@/lib/tenant-notify";
import { appUrl, statusPageUrl } from "@/lib/app-url";
import { localIsoDate } from "@/lib/holidays-gr";

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

export async function subscribeStatus(slug: string, email: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { statusPageSlug: slug, statusPageEnabled: true },
  });
  if (!tenant) throw new Error("Status page not found");
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Invalid email");
  const existing = await prisma.statusSubscriber.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: clean } },
  });
  const token = existing?.token ?? randomToken();
  const row = existing
    ? await prisma.statusSubscriber.update({
        where: { id: existing.id },
        data: { token, confirmedAt: existing.confirmedAt },
      })
    : await prisma.statusSubscriber.create({
        data: { tenantId: tenant.id, email: clean, token },
      });
  const smtp = smtpFromTenant(tenant);
  const confirm = `${appUrl()}/status/confirm?token=${encodeURIComponent(token)}`;
  await sendMail(
    {
      to: clean,
      subject: `Confirm ${tenant.name} status alerts`,
      text: `Confirm status alerts for ${tenant.name}:\n${confirm}\n\nIgnore if you did not request this.`,
    },
    smtp,
  );
  return { ok: true, id: row.id };
}

export async function confirmStatusSubscriber(token: string) {
  const row = await prisma.statusSubscriber.findUnique({ where: { token } });
  if (!row) return null;
  return prisma.statusSubscriber.update({
    where: { id: row.id },
    data: { confirmedAt: row.confirmedAt ?? new Date() },
  });
}

export async function unsubscribeStatus(token: string) {
  const result = await prisma.statusSubscriber.deleteMany({ where: { token } });
  return result.count > 0;
}

export async function sendStatusOutageAlerts(now = new Date()) {
  const tenants = await prisma.tenant.findMany({
    where: { statusPageEnabled: true, statusPageSlug: { not: null } },
    select: {
      id: true,
      name: true,
      timezone: true,
      statusPageSlug: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassEnc: true,
      smtpFrom: true,
    },
  });
  let sent = 0;
  for (const tenant of tenants) {
    const failing = await prisma.cronJob.count({
      where: { tenantId: tenant.id, lastStatus: { in: [...FAILING] } },
    });
    if (failing === 0) continue;
    const today = localIsoDate(now, tenant.timezone);
    const subs = await prisma.statusSubscriber.findMany({
      where: { tenantId: tenant.id, confirmedAt: { not: null }, NOT: { lastAlertDate: today } },
    });
    if (subs.length === 0) continue;
    const smtp = smtpFromTenant(tenant);
    if (!smtp) continue;
    const url = tenant.statusPageSlug ? statusPageUrl(tenant.statusPageSlug) : appUrl();
    const text = `${tenant.name} has ${failing} job${failing === 1 ? "" : "s"} needing attention.\n${url}`;
    for (const sub of subs) {
      const unsub = `${appUrl()}/status/unsubscribe?token=${encodeURIComponent(sub.token)}`;
      await sendMail(
        { to: sub.email, subject: `[SoftifyCron] ${tenant.name} status`, text: `${text}\n\nUnsubscribe: ${unsub}` },
        smtp,
      );
      await prisma.statusSubscriber.update({
        where: { id: sub.id },
        data: { lastAlertDate: today },
      });
      sent += 1;
    }
  }
  return sent;
}
