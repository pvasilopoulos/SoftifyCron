import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatBytes, usagePercents } from "@/lib/usage";
import { capLabel, capWarn } from "@/lib/caps";
import { deadSecretKeys } from "@/lib/dead-secrets";
import { failureHeatmap, heatmapMax } from "@/lib/heatmap";

export const metadata = { title: "Usage" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function UsagePage() {
  const session = await requireSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const month = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tid },
    select: { timezone: true, capJobs: true, capRunsMonth: true },
  });
  const heatSince = new Date(startOfDay);
  heatSince.setDate(heatSince.getDate() - 14);
  const tz = tenant?.timezone ?? "UTC";

  const [jobs, armed, failing, runsToday, runsMonth, bodies, deliveries, pushDevices, secrets, jobRows, failRuns] =
    await Promise.all([
      prisma.cronJob.count({ where: { tenantId: session.tid } }),
      prisma.cronJob.count({ where: { tenantId: session.tid, enabled: true } }),
      prisma.cronJob.count({ where: { tenantId: session.tid, lastStatus: { in: [...FAILING] } } }),
      prisma.jobRun.count({ where: { tenantId: session.tid, startedAt: { gte: startOfDay } } }),
      prisma.jobRun.count({ where: { tenantId: session.tid, startedAt: { gte: month } } }),
      prisma.jobRun.findMany({
        where: { tenantId: session.tid, responseBody: { not: null } },
        select: { responseBody: true },
        take: 200,
        orderBy: { startedAt: "desc" },
      }),
      prisma.notifyDelivery.count({ where: { tenantId: session.tid, createdAt: { gte: month } } }),
      prisma.pushSubscription.count({ where: { tenantId: session.tid } }),
      prisma.secret.findMany({ where: { tenantId: session.tid }, select: { key: true } }),
      prisma.cronJob.findMany({
        where: { tenantId: session.tid },
        select: { name: true, url: true, body: true, headers: true, authUrl: true, authBody: true },
        take: 300,
      }),
      prisma.jobRun.findMany({
        where: { tenantId: session.tid, startedAt: { gte: heatSince } },
        select: { startedAt: true, status: true },
        take: 2000,
      }),
    ]);
  const bodyBytes = bodies.reduce((sum, row) => sum + (row.responseBody?.length ?? 0), 0);
  const percents = usagePercents(
    { jobs, armed, failing, runsMonth, runsToday, bodyBytes, deliveriesMonth: deliveries },
    { jobs: tenant?.capJobs, runsMonth: tenant?.capRunsMonth },
  );
  const dead = deadSecretKeys(
    jobRows.flatMap((job) => [
      job.url,
      job.body,
      job.authUrl,
      job.authBody,
      job.headers ? JSON.stringify(job.headers) : "",
    ]),
    secrets.map((item) => item.key),
  );
  const heat = failureHeatmap(failRuns, tz);
  const heatMax = heatmapMax(heat);

  const cards = [
    { label: "Jobs", value: capLabel(jobs, tenant?.capJobs ?? 0), warn: capWarn(jobs, tenant?.capJobs ?? 0) },
    { label: "Armed", value: String(armed), warn: false },
    { label: "Failing", value: String(failing), warn: failing > 0 },
    { label: "Runs today", value: String(runsToday), warn: false },
    { label: "Runs this month", value: capLabel(runsMonth, tenant?.capRunsMonth ?? 0), warn: capWarn(runsMonth, tenant?.capRunsMonth ?? 0) },
    { label: "Stored bodies (sample)", value: formatBytes(bodyBytes), warn: false },
    { label: "Alert deliveries this month", value: String(deliveries), warn: false },
    { label: "Push devices", value: String(pushDevices), warn: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
          <h1 className="mt-2 font-display text-4xl">Usage</h1>
          <p className="mt-2 text-sm text-ink-dim">
            How much this tenant is running and storing.
            {percents.jobs ? ` Jobs ${percents.jobs}% of cap.` : ""}
            {percents.runsMonth ? ` Runs ${percents.runsMonth}% of monthly cap.` : ""}
          </p>
        </div>
        <a className="btn btn-ghost" href="/api/reports/month">
          Download monthly CSV
        </a>
      </div>
      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label} className="card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">{card.label}</p>
            <p className={`mt-2 font-display text-3xl ${card.warn ? "text-rose" : ""}`}>{card.value}</p>
          </article>
        ))}
      </div>
      <section className="card p-5">
        <h2 className="font-display text-2xl">Failure hours (14d)</h2>
        <p className="mt-1 text-sm text-ink-dim">Darker cells failed more often in this workspace timezone.</p>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-px text-[10px]">
            <span />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} className="text-center text-ink-dim">
                {hour}
              </span>
            ))}
            {WEEKDAYS.map((label, weekday) => (
              <div key={label} className="contents">
                <span className="pr-2 text-ink-dim">{label}</span>
                {heat
                  .filter((cell) => cell.weekday === weekday)
                  .map((cell) => {
                    const t = heatMax ? cell.count / heatMax : 0;
                    return (
                      <span
                        key={`${cell.weekday}-${cell.hour}`}
                        title={`${label} ${cell.hour}:00 · ${cell.count}`}
                        className="block h-4 rounded-sm"
                        style={{ background: `rgba(194, 59, 59, ${0.12 + t * 0.88})` }}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </section>
      {dead.length ? (
        <section className="card p-5">
          <h2 className="font-display text-2xl">Dead secrets</h2>
          <p className="mt-1 text-sm text-ink-dim">Referenced in jobs but missing from Secrets.</p>
          <p className="mt-3 mono text-sm text-rose">{dead.join(", ")}</p>
        </section>
      ) : null}
    </div>
  );
}
