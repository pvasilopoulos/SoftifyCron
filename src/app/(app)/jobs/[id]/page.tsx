import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant } from "@/lib/jobs";
import { describeCron, previewRuns } from "@/lib/cron";
import { formatAbsolute, formatDateTime, formatDuration } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JobActions } from "@/components/job-actions";
import { StatusPill } from "@/components/status-pill";
import { canManage } from "@/lib/acl";

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
  const manage = canManage(session.role);

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
  const tags = job.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/jobs" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
            ← Jobs
          </Link>
          <h1 className="mt-2 font-display text-4xl italic">{job.name}</h1>
          <p className="mt-2 max-w-2xl text-ink-dim">
            {job.description || describeCron(job.cronExpr)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span
              className="rounded-full px-2.5 py-1"
              style={{
                background: `${job.group?.color ?? "#8b93a7"}22`,
                color: job.group?.color ?? "#8b93a7",
              }}
            >
              {job.group?.name ?? "Ungrouped"}
            </span>
            <span className="rounded-full bg-bg-mute px-2.5 py-1">{job.type}</span>
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-bg-mute px-2.5 py-1 text-ink-dim">
                {tag}
              </span>
            ))}
            {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
            {job.keepResponse ? (
              <Link
                href={`/jobs/${job.id}/response`}
                className="rounded-full bg-gold/15 px-2.5 py-1 text-gold-2"
              >
                View response
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {manage ? (
            <Link href={`/jobs/${job.id}/edit`} className="btn btn-ghost">
              Edit
            </Link>
          ) : null}
          <JobActions
            jobId={job.id}
            enabled={job.enabled}
            canManage={manage}
            keepResponse={job.keepResponse}
          />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Target</p>
          <p className="mono mt-3 break-all text-lg">
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
            <div>
              <dt className="text-ink-dim">Retries</dt>
              <dd className="mt-1">
                {job.retryMax} × {job.retryDelaySec}s
              </dd>
            </div>
            <div>
              <dt className="text-ink-dim">Failures</dt>
              <dd className="mt-1">{job.consecutiveFailures}</dd>
            </div>
          </dl>
          {job.notifyUrl ? (
            <p className="mono mt-4 break-all text-xs text-ink-dim">Notify {job.notifyUrl}</p>
          ) : null}
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
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {runs.map((run) => (
                <article key={run.id} className="rounded-2xl border border-line bg-bg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={run.status} />
                    <span className="text-xs text-ink-dim">{run.trigger.toLowerCase()}</span>
                  </div>
                  <p className="mono mt-2 text-xs text-ink-dim">
                    {formatAbsolute(run.startedAt, job.timezone)}
                  </p>
                  <p className="mt-1 text-sm">
                    HTTP {run.httpStatus ?? "—"} · {formatDuration(run.durationMs)}
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
          </>
        )}
      </section>
    </div>
  );
}
