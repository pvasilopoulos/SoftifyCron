import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Client portal" };

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { portalTokenHash: hashToken(decodeURIComponent(token)) },
    select: { id: true, name: true, timezone: true },
  });
  if (!tenant) notFound();
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, lastStatus: true, lastRunAt: true, enabled: true, type: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Read-only portal</p>
      <h1 className="mt-2 font-display text-4xl">{tenant.name}</h1>
      <p className="mt-2 text-sm text-ink-dim">{jobs.length} jobs · no URLs or bodies</p>
      <ul className="mt-8 space-y-3">
        {jobs.map((job) => (
          <li key={job.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{job.name}</p>
              <p className="text-xs text-ink-dim">
                {job.type}
                {job.lastRunAt ? ` · ${formatDateTime(job.lastRunAt, tenant.timezone)}` : ""}
                {job.enabled ? "" : " · paused"}
              </p>
            </div>
            {job.lastStatus ? <StatusPill status={job.lastStatus} /> : <span className="text-xs text-ink-dim">Never</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
