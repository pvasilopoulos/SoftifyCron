import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";

export function validateCron(cronExpr: string, timezone: string) {
  CronExpressionParser.parse(cronExpr, {
    currentDate: new Date(),
    tz: timezone,
  });
}

export function getNextRunAt(
  cronExpr: string,
  timezone: string,
  from: Date = new Date(),
): Date {
  const expression = CronExpressionParser.parse(cronExpr, {
    currentDate: from,
    tz: timezone,
  });
  return expression.next().toDate();
}

/** Jump past the upcoming fire (or an overdue slot) to the following schedule. */
export function skipNextFire(
  cronExpr: string,
  timezone: string,
  scheduled: Date | null | undefined,
  now: Date = new Date(),
): Date {
  const from =
    scheduled && scheduled.getTime() > now.getTime() ? scheduled : now;
  return getNextRunAt(cronExpr, timezone, from);
}

export function previewRuns(
  cronExpr: string,
  timezone: string,
  count = 5,
  from: Date = new Date(),
): Date[] {
  const expression = CronExpressionParser.parse(cronExpr, {
    currentDate: from,
    tz: timezone,
  });
  return Array.from({ length: count }, () => expression.next().toDate());
}

export function describeCron(cronExpr: string): string {
  try {
    return cronstrue.toString(cronExpr, { use24HourTimeFormat: true });
  } catch {
    return cronExpr;
  }
}

export function cronIntervalMs(
  cronExpr: string,
  timezone: string,
  from: Date = new Date(),
): number {
  const first = getNextRunAt(cronExpr, timezone, from);
  const second = getNextRunAt(cronExpr, timezone, first);
  return Math.max(second.getTime() - first.getTime(), 60_000);
}

export function heartbeatStaleAfterMs(cronExpr: string, timezone: string): number {
  const interval = cronIntervalMs(cronExpr, timezone);
  return interval + Math.max(60_000, Math.round(interval * 0.2));
}

export function isHeartbeatStale(
  job: {
    cronExpr: string;
    timezone: string;
    lastHeartbeatAt?: Date | string | null;
    lastRunAt?: Date | string | null;
    lastStatus?: string | null;
    createdAt: Date | string;
  },
  now: Date = new Date(),
): boolean {
  const last =
    job.lastHeartbeatAt ?? (job.lastStatus === "SUCCESS" ? job.lastRunAt : null) ?? job.createdAt;
  const age = now.getTime() - new Date(last).getTime();
  return age > heartbeatStaleAfterMs(job.cronExpr, job.timezone);
}
