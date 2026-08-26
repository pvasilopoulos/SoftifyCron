import { isOverdueSlot, scheduleBlockReason, type ScheduleJob } from "./schedule-policy";
import { capHit } from "./caps";

export type WhySkippedInput = {
  enabled: boolean;
  cronExpr: string;
  timezone: string;
  nextRunAt?: Date | string | null;
  lockedUntil?: Date | string | null;
  dependsOnJobId?: string | null;
  parentLastStatus?: string | null;
  configLocked?: boolean;
  schedule: ScheduleJob;
  tenantHolidays: boolean;
  capJobs?: number;
  capRunsMonth?: number;
  jobs?: number;
  runsMonth?: number;
};

export function whyNotFired(input: WhySkippedInput, now = new Date()): string[] {
  const reasons: string[] = [];
  if (!input.enabled) reasons.push("paused");
  const blocked = scheduleBlockReason(input.schedule, input.tenantHolidays, now);
  if (blocked) reasons.push(blocked);
  if (input.dependsOnJobId && input.parentLastStatus !== "SUCCESS") {
    reasons.push("depends-on not green");
  }
  if (input.lockedUntil && new Date(input.lockedUntil).getTime() > now.getTime()) {
    reasons.push("locked");
  }
  if (isOverdueSlot(input.cronExpr, input.timezone, input.nextRunAt ? new Date(input.nextRunAt) : null, now)) {
    reasons.push("overdue slot skipped");
  }
  if (capHit(input.jobs ?? 0, input.capJobs ?? 0)) reasons.push("job cap");
  if (capHit(input.runsMonth ?? 0, input.capRunsMonth ?? 0)) reasons.push("monthly run cap");
  if (input.nextRunAt && new Date(input.nextRunAt).getTime() > now.getTime() && reasons.length === 0) {
    reasons.push("not due yet");
  }
  return reasons;
}
