import { getNextRunAt } from "./cron";
import { isGreekHoliday, localIsoDate, localMinutes, localWeekday } from "./holidays-gr";
import { parseClockMinutes } from "./notify-policy";

export type ScheduleJob = {
  timezone: string;
  skipHolidays?: boolean;
  skipWeekends?: boolean;
  activeHoursStart?: string | null;
  activeHoursEnd?: string | null;
  snoozeUntil?: Date | string | null;
};

export function inActiveHours(at: Date, timeZone: string, start: string, end: string) {
  const from = parseClockMinutes(start);
  const to = parseClockMinutes(end);
  if (from == null || to == null) return true;
  const minutes = localMinutes(at, timeZone);
  if (from === to) return true;
  if (from < to) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
}

export function scheduleBlockReason(
  job: ScheduleJob,
  tenantHolidays: boolean,
  at: Date = new Date(),
): string | null {
  if (job.snoozeUntil && new Date(job.snoozeUntil).getTime() > at.getTime()) {
    return "snoozed";
  }
  const iso = localIsoDate(at, job.timezone);
  if ((job.skipHolidays || tenantHolidays) && isGreekHoliday(iso)) return "holiday";
  if (job.skipWeekends) {
    const day = localWeekday(at, job.timezone);
    if (day === 0 || day === 6) return "weekend";
  }
  if (!inActiveHours(at, job.timezone, job.activeHoursStart ?? "", job.activeHoursEnd ?? "")) {
    return "outside active hours";
  }
  return null;
}

export function nextAllowedFire(
  cronExpr: string,
  job: ScheduleJob,
  tenantHolidays: boolean,
  from: Date = new Date(),
) {
  let cursor = from;
  if (job.snoozeUntil) {
    const until = new Date(job.snoozeUntil);
    if (until.getTime() > cursor.getTime()) cursor = until;
  }
  for (let hop = 0; hop < 80; hop += 1) {
    const next = getNextRunAt(cronExpr, job.timezone, cursor);
    const reason = scheduleBlockReason(job, tenantHolidays, next);
    if (!reason) return next;
    if (reason === "snoozed" && job.snoozeUntil) {
      cursor = new Date(Math.max(new Date(job.snoozeUntil).getTime(), next.getTime()));
      continue;
    }
    if (reason === "weekend" || reason === "holiday") {
      cursor = new Date(next.getTime() + 18 * 3_600_000);
      continue;
    }
    if (reason === "outside active hours") {
      cursor = new Date(next.getTime() + 30 * 60_000);
      continue;
    }
    cursor = next;
  }
  return getNextRunAt(cronExpr, job.timezone, cursor);
}

export function isOverdueSlot(
  cronExpr: string,
  timezone: string,
  scheduled: Date | null | undefined,
  now: Date = new Date(),
) {
  if (!scheduled) return false;
  const interval = Math.max(
    getNextRunAt(cronExpr, timezone, scheduled).getTime() - scheduled.getTime(),
    60_000,
  );
  return now.getTime() - scheduled.getTime() > interval * 1.5;
}
