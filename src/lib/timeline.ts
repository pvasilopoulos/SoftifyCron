import { previewRuns } from "./cron";
import { scheduleBlockReason, type ScheduleJob } from "./schedule-policy";

export type TimelineJob = ScheduleJob & {
  id: string;
  name: string;
  cronExpr: string;
  lastStatus: string | null;
  nextRunAt: Date | string | null;
  snoozeUntil?: Date | string | null;
};

export type TimelineEvent = {
  jobId: string;
  name: string;
  at: Date;
  kind: "scheduled" | "late" | "blocked";
  reason?: string | null;
  lastStatus: string | null;
};

export function buildTimeline(
  jobs: TimelineJob[],
  tenantHolidays: boolean,
  now = new Date(),
  horizonHours = 24,
  limit = 200,
) {
  const until = now.getTime() + horizonHours * 3_600_000;
  const events: TimelineEvent[] = [];
  for (const job of jobs) {
    const next = job.nextRunAt ? new Date(job.nextRunAt) : null;
    if (next && next.getTime() < now.getTime()) {
      events.push({
        jobId: job.id,
        name: job.name,
        at: next,
        kind: "late",
        lastStatus: job.lastStatus,
      });
    }
    try {
      const upcoming = previewRuns(job.cronExpr, job.timezone, 36, now);
      for (const at of upcoming) {
        if (at.getTime() > until) break;
        const blocked = scheduleBlockReason(job, tenantHolidays, at);
        events.push({
          jobId: job.id,
          name: job.name,
          at,
          kind: blocked ? "blocked" : "scheduled",
          reason: blocked,
          lastStatus: job.lastStatus,
        });
      }
    } catch {
      /* invalid cron */
    }
  }
  return events.sort((left, right) => left.at.getTime() - right.at.getTime()).slice(0, limit);
}
