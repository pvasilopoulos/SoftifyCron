import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant } from "@/lib/jobs";
import { JobForm } from "@/components/job-form";

export const metadata = { title: "Edit job" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
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
        initial={{
          name: job.name,
          description: job.description ?? "",
          cronExpr: job.cronExpr,
          timezone: job.timezone,
          method: job.method,
          url: job.url,
          headers,
          body: job.body ?? "",
          timeoutMs: job.timeoutMs,
          enabled: job.enabled,
        }}
      />
    </div>
  );
}
