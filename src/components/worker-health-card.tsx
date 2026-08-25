"use client";

import { heartbeatStatus } from "@/lib/heartbeat-status";
import { RelativeTime } from "@/components/relative-time";

export function WorkerHealthCard({
  tickedAt,
  jobsClaimed,
}: {
  tickedAt: Date | string | null;
  jobsClaimed: number;
}) {
  const status = heartbeatStatus(tickedAt);
  return (
    <div className={`card p-6 ${status.stale ? "border-rose/40" : ""}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Worker</p>
      <p className={`mt-2 font-display text-3xl ${status.stale ? "text-rose" : ""}`}>
        {status.label}
      </p>
      <p className="mt-2 text-sm text-ink-dim">
        Last tick {tickedAt ? <RelativeTime value={tickedAt} timeZone="Europe/Athens" /> : "never"} ·{" "}
        {jobsClaimed} job{jobsClaimed === 1 ? "" : "s"} last cycle
      </p>
      {status.stale ? (
        <p className="mt-3 text-sm text-rose">
          Plesk Fetch a URL should hit /api/cron/tick every minute.
        </p>
      ) : null}
    </div>
  );
}
