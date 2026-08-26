import { buildTimeline, type TimelineEvent, type TimelineJob } from "./timeline";

export type CalendarDay = {
  date: string;
  label: string;
  events: TimelineEvent[];
};

export function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildWeekCalendar(
  jobs: TimelineJob[],
  tenantHolidays: boolean,
  timeZone: string,
  now = new Date(),
) {
  const events = buildTimeline(jobs, tenantHolidays, now, 24 * 7);
  const days: CalendarDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(now.getTime() + offset * 86_400_000);
    const date = dayKey(day, timeZone);
    const label = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(day);
    days.push({
      date,
      label,
      events: events.filter((event) => dayKey(event.at, timeZone) === date),
    });
  }
  return days;
}
