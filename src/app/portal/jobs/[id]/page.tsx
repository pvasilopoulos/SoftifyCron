import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { PortalShell } from "@/components/portal-shell";
import { PortalAck } from "@/components/portal-ack";
import { requirePortalAccess } from "@/lib/portal-access";
import { getPortalJob, listPortalJobRuns } from "@/lib/portal";
import { isOpenIncident } from "@/lib/inbox";
import { formatDateTime, formatDuration, formatAbsolute } from "@/lib/format";

export const metadata = { title: "Job" };
export const dynamic = "force-dynamic";

export default async function PortalJobPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requirePortalAccess();
  const { id } = await params;
  const job = await getPortalJob(access.tenant.id, access.groupIds, id);
  if (!job) notFound();
  const runs = await listPortalJobRuns(access.tenant.id, job.id, 20);
  const tz = job.timezone || access.tenant.timezone;
  const open = isOpenIncident(job);
  const title = access.client?.name ?? access.tenant.name;
  const logoUrl = access.client?.logoUrl || access.tenant.statusLogoUrl;

  return (
    <PortalShell title={job.name} kicker={title} logoUrl={logoUrl}>
      <p className="text-sm text-ink-dim">
        {job.type} · {job.enabled ? "armed" : "paused"}
        {job.group ? ` · ${job.group.name}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {job.lastStatus ? <StatusPill status={job.lastStatus} /> : <span className="text-xs text-ink-dim">Never run</span>}
      </div>
      <p className="mt-3 text-sm text-ink-dim">
        Last {job.lastRunAt ? formatDateTime(job.lastRunAt, tz) : "—"}
        {job.enabled && job.nextRunAt ? ` · next ${formatAbsolute(job.nextRunAt, tz)}` : ""}
      </p>
      {open ? <PortalAck jobId={job.id} jobName={job.name} /> : job.ackedAt ? (
        <p className="mt-3 text-sm text-ink-dim">
          Acknowledged by {job.ackedBy ?? "someone"}
          {job.ackNote ? ` · ${job.ackNote}` : ""}
        </p>
      ) : null}

      <section className="mt-8 card p-5">
        <h2 className="font-display text-2xl">Recent runs</h2>
        <p className="mt-1 text-sm text-ink-dim">Status and duration only. Bodies are not shown.</p>
        {runs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-dim">No runs stored yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
                <div>
                  <StatusPill status={run.status} />
                  <p className="mt-1 text-xs text-ink-dim">
                    {formatDateTime(run.startedAt, tz)}
                  </p>
                </div>
                <span className="mono text-sm text-ink-dim">{formatDuration(run.durationMs)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}
