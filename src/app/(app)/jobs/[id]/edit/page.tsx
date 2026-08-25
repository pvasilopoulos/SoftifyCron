import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant, listJobOptions } from "@/lib/jobs";
import { listGroups } from "@/lib/groups";
import { JobForm } from "@/components/job-form";
import { hasPermission } from "@/lib/acl";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session, "jobs.edit")) redirect("/jobs");
  const { id } = await params;
  const [job, groups, jobs, tenant] = await Promise.all([
    getJobForTenant(session.tid, id),
    listGroups(session.tid),
    listJobOptions(session.tid),
    prisma.tenant.findUnique({ where: { id: session.tid }, select: { skipGreekHolidays: true } }),
  ]);
  if (!job) notFound();

  const headers =
    job.headers && typeof job.headers === "object"
      ? JSON.stringify(job.headers, null, 2)
      : "";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Edit</p>
        <h1 className="mt-2 font-display text-4xl">{job.name}</h1>
      </div>
      <JobForm
        jobId={job.id}
        groups={groups}
        jobs={jobs}
        tenantHolidays={Boolean(tenant?.skipGreekHolidays)}
        initial={{
          name: job.name,
          description: job.description ?? "",
          groupName: job.group?.name ?? "",
          type: job.type,
          tags: job.tags,
          cronExpr: job.cronExpr,
          timezone: job.timezone,
          method: job.method,
          url: job.url,
          headers,
          body: job.body ?? "",
          timeoutMs: job.timeoutMs,
          retryMax: job.retryMax,
          retryDelaySec: job.retryDelaySec,
          notifyUrl: job.notifyUrl ?? "",
          notifyEmailOn: job.notifyEmailOn,
          notifyTelegramOn: job.notifyTelegramOn,
          notifyWebhookOn: job.notifyWebhookOn,
          notifySlackOn: job.notifySlackOn,
          keepResponse: job.keepResponse,
          responseBoard: job.responseBoard,
          pauseAfter: job.pauseAfter,
          enabled: job.enabled,
          followUpJobId: job.followUpJobId ?? "",
          dependsOnJobId: job.dependsOnJobId ?? "",
          assertStatus: job.assertStatus,
          assertJsonPath: job.assertJsonPath,
          assertEquals: job.assertEquals,
          assertContains: job.assertContains,
          slowAfterMs: job.slowAfterMs,
          skipHolidays: job.skipHolidays,
          skipWeekends: job.skipWeekends,
          activeHoursStart: job.activeHoursStart,
          activeHoursEnd: job.activeHoursEnd,
          notes: job.notes ?? "",
          sloFailPerDay: job.sloFailPerDay,
        }}
      />
    </div>
  );
}
