import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { StatusPill } from "@/components/status-pill";
import { formatAbsolute, formatDateTime } from "@/lib/format";
import { jobStatusStats, statusStats } from "@/lib/status-stats";
import { StatusSubscribe } from "@/components/status-subscribe";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { statusPageSlug: slug, statusPageEnabled: true },
    select: { name: true },
  });
  if (!tenant) return { title: "Status" };
  return {
    title: `${tenant.name} status`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { statusPageSlug: slug, statusPageEnabled: true },
    select: { id: true, name: true, timezone: true },
  });
  if (!tenant) notFound();

  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      enabled: true,
      lastStatus: true,
      lastRunAt: true,
      nextRunAt: true,
      type: true,
    },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });

  const failing = jobs.filter((job) =>
    job.lastStatus === "FAILED" || job.lastStatus === "TIMEOUT" || job.lastStatus === "BLOCKED",
  ).length;
  const healthy = jobs.filter((job) => job.lastStatus === "SUCCESS").length;
  const [stats, perJob] = await Promise.all([
    statusStats(tenant.id),
    jobStatusStats(tenant.id, jobs.map((job) => job.id)),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <Logo />
        <p className="text-xs uppercase tracking-[0.18em] text-ink-dim">Public status</p>
      </div>
      <h1 className="mt-8 font-display text-4xl">{tenant.name}</h1>
      <p className="mt-2 text-ink-dim">
        {jobs.length} jobs · {healthy} healthy · {failing} need attention
        {stats.uptime != null ? ` · ${stats.days}d uptime ${stats.uptime}%` : ""}
      </p>
      {stats.lastOutage ? (
        <p className="mt-2 text-sm text-ink-dim">
          Last outage: {stats.lastOutage.job.name} · {stats.lastOutage.status.toLowerCase()} ·{" "}
          {formatDateTime(stats.lastOutage.startedAt, tenant.timezone)}
        </p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <li className="card p-6 text-ink-dim">No jobs in this workspace yet.</li>
        ) : (
          jobs.map((job) => (
            <li key={job.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.name}</p>
                  <p className="mt-1 text-xs text-ink-dim">
                    {job.enabled ? "armed" : "paused"} · {job.type.toLowerCase()}
                    {perJob.get(job.id)?.uptime != null ? ` · ${stats.days}d ${perJob.get(job.id)?.uptime}%` : ""}
                  </p>
                </div>
                {job.lastStatus ? <StatusPill status={job.lastStatus} /> : (
                  <span className="text-xs text-ink-dim">never run</span>
                )}
              </div>
              <p className="mt-3 text-xs text-ink-dim">
                Last {job.lastRunAt ? formatDateTime(job.lastRunAt, tenant.timezone) : "—"}
                {job.enabled && job.nextRunAt
                  ? ` · next ${formatAbsolute(job.nextRunAt, tenant.timezone)}`
                  : ""}
              </p>
            </li>
          ))
        )}
      </ul>
      <StatusSubscribe slug={slug} />
      <p className="mt-8 text-center text-xs text-ink-dim">Powered by SoftifyCron</p>
    </main>
  );
}
