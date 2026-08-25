"use client";

import { heartbeatStatus } from "@/lib/heartbeat-status";
import { RelativeTime } from "@/components/relative-time";

export function WorkerHealthCard({
  tickedAt,
  jobsClaimed,
  maxConcurrent,
}: {
  tickedAt: Date | string | null;
  jobsClaimed: number;
  maxConcurrent?: number;
}) {
  const status = heartbeatStatus(tickedAt);
  return (
    <div className={`card p-6 ${status.stale ? "border-rose/40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Worker</p>
        <span className={`status-pill ${status.stale ? "status-failed" : "status-success"}`}>
          <i />
          {status.stale ? "stale" : "live"}
        </span>
      </div>
      <p className={`mt-3 font-display text-3xl ${status.stale ? "text-rose" : ""}`}>
        {status.label}
      </p>
      <p className="mt-2 text-sm text-ink-dim">
        Last tick {tickedAt ? <RelativeTime value={tickedAt} timeZone="Europe/Athens" /> : "never"} ·{" "}
        {jobsClaimed} job{jobsClaimed === 1 ? "" : "s"} last cycle
        {maxConcurrent ? ` · max ${maxConcurrent} concurrent` : ""}
      </p>
      <p className="mt-2 text-sm text-ink-dim">
        Honours snooze, Greek holidays, weekends, active hours, and workspace concurrency.
      </p>
      {status.stale ? (
        <p className="mt-3 text-sm text-rose">
          Plesk Fetch a URL should hit /api/cron/tick every minute.
        </p>
      ) : null}
    </div>
  );
}
