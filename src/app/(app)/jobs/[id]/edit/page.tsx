import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant } from "@/lib/jobs";
import { listGroups } from "@/lib/groups";
import { JobForm } from "@/components/job-form";
import { canManage } from "@/lib/acl";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!canManage(session.role)) redirect("/jobs");
  const { id } = await params;
  const [job, groups] = await Promise.all([
    getJobForTenant(session.tid, id),
    listGroups(session.tid),
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
        <h1 className="mt-2 font-display text-4xl italic">{job.name}</h1>
      </div>
      <JobForm
        jobId={job.id}
        groups={groups}
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
          keepResponse: job.keepResponse,
          pauseAfter: job.pauseAfter,
          enabled: job.enabled,
        }}
      />
    </div>
  );
}
