import { buildTimeline, type TimelineJob } from "./timeline";

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function calendarIcs(jobs: TimelineJob[], tenantHolidays: boolean, calendarName: string, now = new Date()) {
  const events = buildTimeline(jobs, tenantHolidays, now, 24 * 7);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SoftifyCron//EN",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];
  for (const event of events) {
    const end = new Date(event.at.getTime() + 15 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.jobId}-${icsStamp(event.at)}@softifycron`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART:${icsStamp(event.at)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape(event.name)}${event.kind === "blocked" ? " (blocked)" : ""}`,
      event.reason ? `DESCRIPTION:${icsEscape(event.reason)}` : "DESCRIPTION:Scheduled job",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
