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
