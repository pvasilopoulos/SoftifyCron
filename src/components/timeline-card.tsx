import Link from "next/link";
import { RelativeTime } from "@/components/relative-time";
import { StatusPill } from "@/components/status-pill";
import type { TimelineEvent } from "@/lib/timeline";
import { formatAbsolute } from "@/lib/format";

export function TimelineCard({
  events,
  timeZone,
}: {
  events: TimelineEvent[];
  timeZone: string;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Next 24 hours</h2>
        <p className="text-xs text-ink-dim">Scheduled · late · blocked</p>
      </div>
      {events.length === 0 ? (
        <p className="mt-5 text-sm text-ink-dim">No upcoming fires in the next day.</p>
      ) : (
        <ol className="mt-5 space-y-3">
          {events.map((event, index) => (
            <li key={`${event.jobId}-${event.at.toISOString()}-${index}`} className="flex gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  event.kind === "late"
                    ? "bg-rose"
                    : event.kind === "blocked"
                      ? "bg-ink-dim/50"
                      : "bg-gold"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1 border-b border-line pb-3 last:border-0 last:pb-0">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <Link href={`/jobs/${event.jobId}`} className="min-w-0 truncate font-medium hover:text-gold">
                    {event.name}
                  </Link>
                  {event.lastStatus ? <StatusPill status={event.lastStatus} /> : null}
                </div>
                <p className="mt-1 text-xs text-ink-dim">
                  <RelativeTime value={event.at} timeZone={timeZone} />
                  <span className="mono"> · {formatAbsolute(event.at, timeZone)}</span>
                  {event.kind === "late"
                    ? " · late"
                    : event.kind === "blocked"
                      ? ` · skipped (${event.reason})`
                      : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
