import { localIsoDate, localWeekday } from "./holidays-gr";
import { parseEmails } from "./notify-policy";

export function parseOncallRoster(raw: string | null | undefined) {
  return parseEmails(raw);
}

export function weeksSinceMonday(at: Date, timeZone: string) {
  const iso = localIsoDate(at, timeZone);
  const [year, month, day] = iso.split("-").map(Number);
  const utc = Date.UTC(year!, (month ?? 1) - 1, day ?? 1);
  const weekday = localWeekday(at, timeZone);
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = utc + mondayOffset * 86_400_000;
  return Math.floor(monday / (7 * 86_400_000));
}

export function currentOncall(
  roster: string | null | undefined,
  timeZone: string,
  at = new Date(),
) {
  const emails = parseOncallRoster(roster);
  if (emails.length === 0) return null;
  const week = weeksSinceMonday(at, timeZone);
  const index = ((week % emails.length) + emails.length) % emails.length;
  return emails[index] ?? null;
}

export function mergeOncallEmails(base: string[], oncall: string | null) {
  if (!oncall) return base;
  if (base.includes(oncall)) return base;
  return [oncall, ...base];
}
