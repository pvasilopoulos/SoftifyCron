/** Orthodox Easter (Gregorian) via Meeus Julian algorithm + 13-day offset. */
export function orthodoxEaster(year: number) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const utc = Date.UTC(year, month - 1, day + 13);
  const date = new Date(utc);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function shiftIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year!, (month ?? 1) - 1, (day ?? 1) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function greekHolidaySet(year: number) {
  const easter = orthodoxEaster(year);
  return new Set([
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-03-25`,
    `${year}-05-01`,
    `${year}-08-15`,
    `${year}-10-28`,
    `${year}-12-25`,
    `${year}-12-26`,
    easter,
    shiftIso(easter, 1),
    shiftIso(easter, -2),
    shiftIso(easter, -48),
    shiftIso(easter, 49),
  ]);
}

export function isGreekHoliday(isoDate: string) {
  const year = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  return greekHolidaySet(year).has(isoDate);
}

export function localIsoDate(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function localWeekday(at: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

export function localMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}
