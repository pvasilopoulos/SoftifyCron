import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatAbsolute, formatDuration } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";

export const metadata = { title: "Run history" };

export default async function RunsPage() {
  const session = await requireSession();
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  const tz = tenant?.timezone ?? "UTC";
  const runs = await prisma.jobRun.findMany({
    where: { tenantId: session.tid },
    include: { job: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Audit</p>
        <h1 className="mt-2 font-display text-4xl italic">Run history</h1>
      </div>
      <div className="overflow-hidden rounded-[1.25rem] border border-line">
        {runs.length === 0 ? (
          <p className="px-6 py-10 text-ink-dim">No runs in this tenant yet.</p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
              <tr>
                <th className="px-5 py-3 font-medium">Job</th>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Trigger</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">HTTP</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-line bg-bg-elev/70">
                  <td className="px-5 py-3 font-medium">{run.job.name}</td>
                  <td className="px-5 py-3 mono text-ink-dim">
                    {formatAbsolute(run.startedAt, tz)}
                  </td>
                  <td className="px-5 py-3 text-ink-dim">
                    {run.trigger.toLowerCase()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={run.status} />
                  </td>
                  <td className="px-5 py-3 mono">{run.httpStatus ?? "—"}</td>
                  <td className="px-5 py-3">{formatDuration(run.durationMs)}</td>
                  <td className="px-5 py-3 text-ink-dim">{run.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
