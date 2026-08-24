import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { describeCron } from "@/lib/cron";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const session = await requireSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [tenant, jobs, active, upcoming, runsToday, successesToday, recent] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tid } }),
      prisma.cronJob.count({ where: { tenantId: session.tid } }),
      prisma.cronJob.count({ where: { tenantId: session.tid, enabled: true } }),
      prisma.cronJob.findMany({
        where: { tenantId: session.tid, enabled: true, nextRunAt: { not: null } },
        orderBy: { nextRunAt: "asc" },
        take: 6,
      }),
      prisma.jobRun.count({
        where: { tenantId: session.tid, startedAt: { gte: startOfDay } },
      }),
      prisma.jobRun.count({
        where: {
          tenantId: session.tid,
          startedAt: { gte: startOfDay },
          status: "SUCCESS",
        },
      }),
      prisma.jobRun.findMany({
        where: { tenantId: session.tid },
        include: { job: { select: { name: true } } },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
    ]);
  const tz = tenant?.timezone ?? "UTC";

  const rate =
    runsToday === 0 ? "—" : `${Math.round((successesToday / runsToday) * 100)}%`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Overview</p>
          <h1 className="mt-2 font-display text-4xl italic">{session.tname}</h1>
        </div>
        <Link href="/jobs/new" className="btn btn-gold">
          New job
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Jobs", String(jobs)],
          ["Armed", String(active)],
          ["Runs today", String(runsToday)],
          ["Success today", rate],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">
              {label}
            </p>
            <p className="mt-3 font-display text-4xl">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl italic">Next to fire</h2>
            <Link href="/jobs" className="text-sm text-gold">
              All jobs
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-dim">
                No enabled jobs yet. Create one and the worker will pick it up.
              </p>
            ) : (
              upcoming.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{job.name}</p>
                    <span className="text-xs text-ink-dim">
                      {formatDateTime(job.nextRunAt, job.timezone)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-dim">
                    {describeCron(job.cronExpr)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl italic">Recent runs</h2>
            <Link href="/runs" className="text-sm text-gold">
              History
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-ink-dim">
                Nothing has executed in this tenant yet.
              </p>
            ) : (
              recent.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 border-b border-line pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{run.job.name}</p>
                    <p className="text-xs text-ink-dim">
                      {formatDateTime(run.startedAt, tz)}
                    </p>
                  </div>
                  <StatusPill status={run.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
