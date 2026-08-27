import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sortInbox } from "@/lib/inbox";
import { StatusPill } from "@/components/status-pill";
import { AckButton } from "@/components/ack-button";
import { RelativeTime } from "@/components/relative-time";
import { hasPermission } from "@/lib/acl";
import { AssignInline } from "@/components/assign-inline";

export const metadata = { title: "Inbox" };

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

export default async function InboxPage() {
  const session = await requireSession();
  const canAck = hasPermission(session, "jobs.run");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid }, select: { timezone: true } });
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: session.tid, lastStatus: { in: [...FAILING] } },
    orderBy: { lastRunAt: "desc" },
    take: 80,
  });
  const open = sortInbox(jobs);
  const acked = jobs.filter((job) => !open.some((item) => item.id === job.id));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Incidents</p>
        <h1 className="mt-2 font-display text-4xl">Inbox</h1>
        <p className="mt-2 text-sm text-ink-dim">Open failures until someone acks. Acked items stay here until the next run.</p>
      </div>
      <section className="card p-5">
        <h2 className="font-display text-2xl">Needs attention · {open.length}</h2>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-ink-dim">Nothing open.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {open.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:text-gold">
                    {job.name}
                  </Link>
                  <p className="text-xs text-ink-dim">
                    {job.consecutiveFailures} consecutive
                    {job.assigneeEmail ? ` · ${job.assigneeEmail}` : ""}
                    {job.lastRunAt ? (
                      <>
                        {" · "}
                        <RelativeTime value={job.lastRunAt} timeZone={tenant?.timezone ?? "UTC"} />
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                  {canAck ? <AssignInline jobId={job.id} email={job.assigneeEmail ?? ""} /> : null}
                  {canAck ? <AckButton jobId={job.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {acked.length ? (
        <section className="card p-5">
          <h2 className="font-display text-2xl">Acknowledged</h2>
          <ul className="mt-4 space-y-2">
            {acked.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/jobs/${job.id}`} className="hover:text-gold">
                    {job.name}
                  </Link>
                  <p className="text-xs text-ink-dim">
                    {job.ackedBy ?? "someone"}
                    {job.ackNote ? ` · ${job.ackNote}` : ""}
                  </p>
                </div>
                {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
