import { StatusPill } from "@/components/status-pill";
import { PortalShell } from "@/components/portal-shell";
import { PortalAck } from "@/components/portal-ack";
import { requirePortalAccess } from "@/lib/portal-access";
import { portalHomeData } from "@/lib/portal";
import { formatDateTime, formatAbsolute } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Client portal" };
export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const access = await requirePortalAccess();
  const data = await portalHomeData(access.tenant.id, access.groupIds);
  const title = access.client?.name ?? access.tenant.name;
  const logoUrl = access.client?.logoUrl || access.tenant.statusLogoUrl;
  const tz = access.tenant.timezone;

  return (
    <PortalShell title={title} kicker="Client portal" logoUrl={logoUrl}>
      <p className="text-sm text-ink-dim">
        {data.jobs.length} jobs · {data.healthy} healthy · {data.failing} failing
        {data.never ? ` · ${data.never} never run` : ""}
        {data.stats.uptime != null ? ` · 30d success ${data.stats.uptime}%` : " · 30d success —"}
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">Health</p>
          <p className="mt-2 font-display text-3xl">
            {data.healthy} / {data.failing}
            {data.never ? ` / ${data.never}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            healthy / failing{data.never ? " / never" : ""}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">Open incidents</p>
          <p className="mt-2 font-display text-3xl">{data.open.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">30-day success</p>
          <p className="mt-2 font-display text-3xl">{data.stats.uptime != null ? `${data.stats.uptime}%` : "—"}</p>
        </div>
      </section>

      <section className="mt-8 card p-5">
        <h2 className="font-display text-2xl">Open incidents</h2>
        {data.open.length === 0 ? (
          <p className="mt-3 text-sm text-ink-dim">Nothing needs attention.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {data.open.map((job) => (
              <li key={job.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link className="font-medium" href={`/portal/jobs/${job.id}`}>
                    {job.name}
                  </Link>
                  {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                </div>
                <p className="mt-1 text-xs text-ink-dim">
                  Last {job.lastRunAt ? formatDateTime(job.lastRunAt, tz) : "—"}
                </p>
                <PortalAck jobId={job.id} jobName={job.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 card p-5">
        <h2 className="font-display text-2xl">Upcoming fires</h2>
        {data.upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-ink-dim">No upcoming runs in this view.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.upcoming.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/portal/jobs/${job.id}`}>{job.name}</Link>
                <span className="text-ink-dim">
                  {job.nextRunAt ? formatAbsolute(job.nextRunAt, tz) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Jobs</h2>
        <ul className="mt-4 space-y-3">
          {data.jobs.length === 0 ? (
            <li className="card p-5 text-ink-dim">No jobs in the groups for this portal.</li>
          ) : (
            data.jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/portal/jobs/${job.id}`} className="card flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="text-xs text-ink-dim">
                      {job.type}
                      {job.enabled ? " · armed" : " · paused"}
                      {job.group ? ` · ${job.group.name}` : ""}
                      {job.lastRunAt ? ` · last ${formatDateTime(job.lastRunAt, tz)}` : ""}
                      {job.enabled && job.nextRunAt ? ` · next ${formatAbsolute(job.nextRunAt, tz)}` : ""}
                    </p>
                  </div>
                  {job.lastStatus ? <StatusPill status={job.lastStatus} /> : (
                    <span className="text-xs text-ink-dim">Never</span>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </PortalShell>
  );
}
