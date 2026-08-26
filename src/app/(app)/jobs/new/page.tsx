import { redirect } from "next/navigation";
import { JobForm } from "@/components/job-form";
import { requireSession } from "@/lib/session";
import { listGroups } from "@/lib/groups";
import { hasPermission } from "@/lib/acl";
import { tenantNotifyDefaults } from "@/lib/tenant-notify";
import { listJobOptions } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { listNotifyTemplates } from "@/lib/notify-templates";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  const session = await requireSession();
  if (!hasPermission(session, "jobs.edit")) redirect("/jobs");
  const [groups, defaults, jobs, tenant, telegramTemplates] = await Promise.all([
    listGroups(session.tid),
    tenantNotifyDefaults(session.tid),
    listJobOptions(session.tid),
    prisma.tenant.findUnique({ where: { id: session.tid }, select: { skipGreekHolidays: true } }),
    listNotifyTemplates(session.tid),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Create</p>
        <h1 className="mt-2 font-display text-4xl">New job</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          The URL is checked against private/loopback hosts before it is stored.
          The worker will only execute it inside {session.tname}.
        </p>
      </div>
      <JobForm
        groups={groups}
        jobs={jobs}
        telegramTemplates={telegramTemplates}
        tenantHolidays={Boolean(tenant?.skipGreekHolidays)}
        initial={{
          timezone: defaults.timezone,
          notifyEmailOn: defaults.notifyEmailOn,
          notifyTelegramOn: defaults.notifyTelegramOn,
          notifyWebhookOn: defaults.notifyWebhookOn,
          notifySlackOn: defaults.notifySlackOn,
          notifyDiscordOn: defaults.notifyDiscordOn,
          notifySmsOn: defaults.notifySmsOn,
        }}
      />
    </div>
  );
}
