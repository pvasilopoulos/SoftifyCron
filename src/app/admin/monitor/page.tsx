import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/status-pill";
import { RelativeTime } from "@/components/relative-time";
import { WorkerHealthCard } from "@/components/worker-health-card";
import { getWorkerHeartbeat } from "@/lib/heartbeat";
import { enterCustomerAction } from "@/app/actions/admin";

export const metadata = { title: "Monitor" };

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

export default async function MonitorPage() {
  const [heartbeat, jobs] = await Promise.all([
    getWorkerHeartbeat(),
    prisma.cronJob.findMany({
      where: { lastStatus: { in: [...FAILING] } },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { lastRunAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
        <h1 className="mt-2 font-display text-4xl">Monitor</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Worker last tick and jobs failing across every tenant.
        </p>
      </div>
      <WorkerHealthCard tickedAt={heartbeat?.tickedAt ?? null} jobsClaimed={heartbeat?.jobsClaimed ?? 0} />
      {jobs.length === 0 ? (
        <div className="card p-8 text-ink-dim">No failing jobs right now.</div>
      ) : (
        <div className="overflow-hidden rounded-[1.25rem] border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Failures</th>
                <th className="px-4 py-3 font-medium">Last run</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{job.name}</td>
                  <td className="px-4 py-3">{job.tenant.name}</td>
                  <td className="px-4 py-3">
                    {job.lastStatus ? <StatusPill status={job.lastStatus} /> : "—"}
                  </td>
                  <td className="px-4 py-3">{job.consecutiveFailures}</td>
                  <td className="px-4 py-3 text-ink-dim">
                    <RelativeTime value={job.lastRunAt} timeZone={job.timezone} />
                  </td>
                  <td className="px-4 py-3">
                    <form action={enterCustomerAction}>
                      <input type="hidden" name="tenantId" value={job.tenantId} />
                      <button className="btn btn-ghost btn-sm" type="submit">
                        Open
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-ink-dim">
        <Link className="text-gold" href="/admin/audit">
          Audit log
        </Link>
      </p>
    </div>
  );
}
