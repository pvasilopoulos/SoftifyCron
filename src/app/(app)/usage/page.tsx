import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { formatBytes, usagePercents } from "@/lib/usage";
import { capLabel, capWarn } from "@/lib/caps";
import { loadDeadSecrets, loadUsageCards, loadUsageHeat } from "@/lib/usage-load";

export const metadata = { title: "Usage" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function UsagePage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
          <h1 className="mt-2 font-display text-4xl">Usage</h1>
          <p className="mt-2 text-sm text-ink-dim">How much this tenant is running and storing.</p>
        </div>
        <a className="btn btn-ghost" href="/api/reports/month">
          Download monthly CSV
        </a>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <UsageCards tenantId={session.tid} />
      </Suspense>
      <Suspense fallback={<HeatSkeleton />}>
        <UsageHeat tenantId={session.tid} />
      </Suspense>
      <Suspense fallback={null}>
        <DeadSecrets tenantId={session.tid} />
      </Suspense>
    </div>
  );
}

async function UsageCards({ tenantId }: { tenantId: string }) {
  const data = await loadUsageCards(tenantId);
  const percents = usagePercents(
    {
      jobs: data.jobs,
      armed: data.armed,
      failing: data.failing,
      runsMonth: data.runsMonth,
      runsToday: data.runsToday,
      bodyBytes: data.bodyBytes,
      deliveriesMonth: data.deliveries,
    },
    { jobs: data.capJobs, runsMonth: data.capRunsMonth },
  );
  const cards = [
    { label: "Jobs", value: capLabel(data.jobs, data.capJobs), warn: capWarn(data.jobs, data.capJobs) },
    { label: "Armed", value: String(data.armed), warn: false },
    { label: "Failing", value: String(data.failing), warn: data.failing > 0 },
    { label: "Runs today", value: String(data.runsToday), warn: false },
    { label: "Runs this month", value: capLabel(data.runsMonth, data.capRunsMonth), warn: capWarn(data.runsMonth, data.capRunsMonth) },
    { label: "Stored bodies", value: formatBytes(data.bodyBytes), warn: false },
    { label: "Alert deliveries this month", value: String(data.deliveries), warn: false },
    { label: "Push devices", value: String(data.pushDevices), warn: false },
  ];

  return (
    <>
      {percents.jobs || percents.runsMonth ? (
        <p className="-mt-2 text-sm text-ink-dim">
          {percents.jobs ? `Jobs ${percents.jobs}% of cap.` : ""}
          {percents.jobs && percents.runsMonth ? " " : ""}
          {percents.runsMonth ? `Runs ${percents.runsMonth}% of monthly cap.` : ""}
        </p>
      ) : null}
      <div className="stat-grid">
        {cards.map((card) => (
          <article key={card.label} className="card p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">{card.label}</p>
            <p className={`mt-2 font-display text-3xl ${card.warn ? "text-rose" : ""}`}>{card.value}</p>
          </article>
        ))}
      </div>
    </>
  );
}

async function UsageHeat({ tenantId }: { tenantId: string }) {
  const { heat, heatMax } = await loadUsageHeat(tenantId);
  return (
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
  );
}

async function DeadSecrets({ tenantId }: { tenantId: string }) {
  const dead = await loadDeadSecrets(tenantId);
  if (!dead.length) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-2xl">Dead secrets</h2>
      <p className="mt-1 text-sm text-ink-dim">Referenced in jobs but missing from Secrets.</p>
      <p className="mt-3 mono text-sm text-rose">{dead.join(", ")}</p>
    </section>
  );
}

function CardsSkeleton() {
  return (
    <div className="stat-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <article key={i} className="card p-5">
          <div className="h-3 w-20 rounded bg-bg-mute" />
          <div className="mt-3 h-8 w-16 rounded bg-bg-mute" />
        </article>
      ))}
    </div>
  );
}

function HeatSkeleton() {
  return (
    <section className="card p-5">
      <div className="h-7 w-48 rounded bg-bg-mute" />
      <div className="mt-4 h-32 rounded-2xl bg-bg-mute" />
    </section>
  );
}
