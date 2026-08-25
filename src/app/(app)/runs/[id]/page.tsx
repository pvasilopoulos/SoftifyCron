import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/status-pill";
import { RelativeTime } from "@/components/relative-time";
import { formatAbsolute, formatDuration } from "@/lib/format";
import { hasPermission } from "@/lib/acl";

export const metadata = { title: "Run" };

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session, "runs.view")) notFound();
  const { id } = await params;
  const run = await prisma.jobRun.findFirst({
    where: { id, tenantId: session.tid },
    include: { job: { select: { id: true, name: true, timezone: true, keepResponse: true } } },
  });
  if (!run) notFound();
  const tz = run.job.timezone;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/runs" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
          ← Runs
        </Link>
        <h1 className="mt-2 font-display text-4xl">{run.job.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill status={run.status} />
          <span className="text-sm text-ink-dim">{run.trigger.toLowerCase()}</span>
        </div>
      </div>
      <section className="card p-6">
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-ink-dim">Started</dt>
            <dd className="mt-1">
              <RelativeTime value={run.startedAt} timeZone={tz} />
              <span className="mt-1 block text-xs text-ink-dim">{formatAbsolute(run.startedAt, tz)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-dim">Duration</dt>
            <dd className="mt-1">{formatDuration(run.durationMs)}</dd>
          </div>
          <div>
            <dt className="text-ink-dim">HTTP</dt>
            <dd className="mono mt-1">{run.httpStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-dim">Job</dt>
            <dd className="mt-1">
              <Link className="text-gold" href={`/jobs/${run.job.id}`}>
                Open job
              </Link>
            </dd>
          </div>
        </dl>
        {run.error ? <p className="mt-6 text-sm text-rose">{run.error}</p> : null}
        {run.responseBody ? (
          <pre className="mono mt-6 overflow-x-auto rounded-2xl bg-bg p-4 text-xs">
            {run.responseBody}
          </pre>
        ) : run.job.keepResponse ? (
          <p className="mt-6 text-sm text-ink-dim">No response body stored for this run.</p>
        ) : null}
      </section>
    </div>
  );
}
