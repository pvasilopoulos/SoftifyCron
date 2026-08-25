export function formatDateTime(
  value: Date | string | null | undefined,
  timeZone = "UTC",
) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatAbsolute(
  value: Date | string | null | undefined,
  timeZone = "UTC",
) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    hour12: false,
  }).format(new Date(value));
}

export function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatRelative(
  value: Date | string | null | undefined,
  now: Date = new Date(),
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = date.getTime() - now.getTime();
  const past = diff < 0;
  const sec = Math.round(Math.abs(diff) / 1000);
  if (sec < 8) return past ? "just now" : "in a moment";
  if (sec < 60) return past ? `${sec}s ago` : `in ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return past ? `${min} min ago` : `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return past ? `${hr}h ago` : `in ${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 14) return past ? `${day}d ago` : `in ${day}d`;
  return formatDateTime(date);
}

export function slugify(input: string) {
  const base = input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  return base || "workspace";
}

export const TIMEZONES = [
  "Europe/Athens",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Nicosia",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];
