import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { describeCron } from "@/lib/cron";
import { RelativeTime } from "@/components/relative-time";
import { StatusPill } from "@/components/status-pill";
import { canManage } from "@/lib/acl";

export const metadata = { title: "Overview" };

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

export default async function DashboardPage() {
  const session = await requireSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const manage = canManage(session.role);

  const [tenant, jobs, active, failingCount, failing, upcoming, runsToday, successesToday, recent] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tid } }),
      prisma.cronJob.count({ where: { tenantId: session.tid } }),
      prisma.cronJob.count({ where: { tenantId: session.tid, enabled: true } }),
      prisma.cronJob.count({
        where: { tenantId: session.tid, lastStatus: { in: [...FAILING] } },
      }),
      prisma.cronJob.findMany({
        where: { tenantId: session.tid, lastStatus: { in: [...FAILING] } },
        orderBy: { lastRunAt: "desc" },
        take: 8,
      }),
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
        {manage ? (
          <Link href="/jobs/new" className="btn btn-gold">
            New job
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          ["Jobs", String(jobs), "/jobs"],
          ["Armed", String(active), "/jobs?state=armed"],
          ["Failing", String(failingCount), "/jobs?state=failing"],
          ["Runs today", String(runsToday), "/runs"],
          ["Success today", rate, "/runs?status=SUCCESS"],
        ].map(([label, value, href]) => (
          <Link key={label} href={href} className="card card-hover p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">
              {label}
            </p>
            <p className="mt-3 font-display text-3xl sm:text-4xl">{value}</p>
          </Link>
        ))}
      </section>

      {failing.length > 0 ? (
        <section className="card border-rose/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl italic text-rose">Needs attention</h2>
            <Link href="/jobs?state=failing" className="text-sm text-gold">
              All failing
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {failing.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block border-b border-line pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{job.name}</p>
                  {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                </div>
                <p className="mt-1 text-sm text-ink-dim">
                  {job.consecutiveFailures} consecutive ·{" "}
                  <RelativeTime value={job.lastRunAt} timeZone={job.timezone} />
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
                    <span className="text-xs text-gold-2">
                      <RelativeTime value={job.nextRunAt} timeZone={job.timezone} />
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
                      <RelativeTime value={run.startedAt} timeZone={tz} />
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
