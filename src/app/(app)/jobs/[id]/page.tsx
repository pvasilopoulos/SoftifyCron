import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant } from "@/lib/jobs";
import { describeCron, previewRuns } from "@/lib/cron";
import { formatAbsolute, formatDateTime, formatDuration } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JobActions } from "@/components/job-actions";
import { StatusPill } from "@/components/status-pill";

export const metadata = { title: "Job" };

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) notFound();

  const runs = await prisma.jobRun.findMany({
    where: { tenantId: session.tid, jobId: job.id },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  let upcoming: Date[] = [];
  try {
    upcoming = job.enabled ? previewRuns(job.cronExpr, job.timezone, 5) : [];
  } catch {
    upcoming = [];
  }

  const headers =
    job.headers && typeof job.headers === "object"
      ? JSON.stringify(job.headers, null, 2)
      : "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/jobs" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
            ← Jobs
          </Link>
          <h1 className="mt-2 font-display text-4xl italic">{job.name}</h1>
          <p className="mt-2 max-w-2xl text-ink-dim">
            {job.description || describeCron(job.cronExpr)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/jobs/${job.id}/edit`} className="btn btn-ghost">
            Edit
          </Link>
          <JobActions jobId={job.id} enabled={job.enabled} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Target</p>
          <p className="mono mt-3 text-lg">
            {job.method} {job.url}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-ink-dim">Cron</dt>
              <dd className="mono mt-1">{job.cronExpr}</dd>
            </div>
            <div>
              <dt className="text-ink-dim">Timezone</dt>
              <dd className="mt-1">{job.timezone}</dd>
            </div>
            <div>
              <dt className="text-ink-dim">Next run</dt>
              <dd className="mt-1">{formatDateTime(job.nextRunAt, job.timezone)}</dd>
            </div>
            <div>
              <dt className="text-ink-dim">Timeout</dt>
              <dd className="mt-1">{formatDuration(job.timeoutMs)}</dd>
            </div>
          </dl>
          <pre className="mono mt-6 overflow-x-auto rounded-2xl bg-bg p-4 text-xs text-gold-2">
            {headers}
          </pre>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Upcoming</p>
          <ol className="mt-4 space-y-2 text-sm text-ink-dim">
            {upcoming.length === 0 ? (
              <li>Paused</li>
            ) : (
              upcoming.map((date) => (
                <li key={date.toISOString()} className="mono">
                  {formatAbsolute(date, job.timezone)}
                </li>
              ))
            )}
          </ol>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-2xl italic">Runs</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-6 py-8 text-sm text-ink-dim">No executions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-ink-dim">
                <tr>
                  <th className="px-6 py-3 font-medium">When</th>
                  <th className="px-6 py-3 font-medium">Trigger</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">HTTP</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-line">
                    <td className="px-6 py-3">
                      {formatAbsolute(run.startedAt, job.timezone)}
                    </td>
                    <td className="px-6 py-3 text-ink-dim">
                      {run.trigger.toLowerCase()}
                    </td>
                    <td className="px-6 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-6 py-3 mono">{run.httpStatus ?? "—"}</td>
                    <td className="px-6 py-3">{formatDuration(run.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
