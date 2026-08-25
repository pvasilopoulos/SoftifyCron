import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { listAuditEvents } from "@/lib/audit";
import { RelativeTime } from "@/components/relative-time";
import { hasPermission } from "@/lib/acl";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit" };

export default async function TenantAuditPage() {
  const session = await requireSession();
  if (!hasPermission(session, "settings.edit") && !hasPermission(session, "people.view")) {
    notFound();
  }
  const [events, tenant] = await Promise.all([
    listAuditEvents({ tenantId: session.tid, take: 150 }),
    prisma.tenant.findUnique({ where: { id: session.tid }, select: { timezone: true } }),
  ]);
  const tz = tenant?.timezone ?? "Europe/Athens";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Workspace</p>
        <h1 className="mt-2 font-display text-4xl">Audit</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Who paused, snoozed, edited, or acknowledged a job in this workspace.
        </p>
      </div>
      {events.length === 0 ? (
        <div className="card p-8 text-ink-dim">No audit events yet.</div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {events.map((event) => (
              <article key={event.id} className="card p-4">
                <p className="mono text-sm">{event.action}</p>
                <p className="mt-1 text-sm text-ink-dim">{event.actor?.email ?? "—"}</p>
                <p className="mt-1 text-xs text-ink-dim">
                  <RelativeTime value={event.createdAt} timeZone={tz} />
                </p>
                {event.target ? <p className="mono mt-2 break-any text-xs text-ink-dim">{event.target}</p> : null}
              </article>
            ))}
          </div>
          <div className="table-wrap hidden md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-line">
                    <td className="px-4 py-3 text-ink-dim">
                      <RelativeTime value={event.createdAt} timeZone={tz} />
                    </td>
                    <td className="px-4 py-3 mono">{event.action}</td>
                    <td className="px-4 py-3">{event.actor?.email ?? "—"}</td>
                    <td className="px-4 py-3 mono text-xs">{event.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
