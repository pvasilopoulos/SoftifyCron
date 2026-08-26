import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatBytes } from "@/lib/usage";

export const metadata = { title: "Usage" };

export default async function UsagePage() {
  const session = await requireSession();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const month = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

  const [jobs, armed, failing, runsToday, runsMonth, bodies, deliveries, pushDevices] = await Promise.all([
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
  ]);
  const bodyBytes = bodies.reduce((sum, row) => sum + (row.responseBody?.length ?? 0), 0);

  const cards = [
    { label: "Jobs", value: String(jobs) },
    { label: "Armed", value: String(armed) },
    { label: "Failing", value: String(failing) },
    { label: "Runs today", value: String(runsToday) },
    { label: "Runs this month", value: String(runsMonth) },
    { label: "Stored bodies (sample)", value: formatBytes(bodyBytes) },
    { label: "Alert deliveries this month", value: String(deliveries) },
    { label: "Push devices", value: String(pushDevices) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
        <h1 className="mt-2 font-display text-4xl">Usage</h1>
        <p className="mt-2 text-sm text-ink-dim">How much this tenant is running and storing.</p>
      </div>
      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label} className="card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">{card.label}</p>
            <p className="mt-2 font-display text-3xl">{card.value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
