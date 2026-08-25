import { parseNotifyList, serializeNotifyList, type NotifyEvent } from "./notify-events";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSmtpPort(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || n < 1 || n > 65535) return 587;
  return Math.trunc(n);
}

export function parseEmails(raw: string | null | undefined): string[] {
  const parts = String(raw ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!EMAIL_RE.test(part) || part.length > 160) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    out.push(part);
    if (out.length >= 20) break;
  }
  return out;
}

export function parseEmailsStrict(raw: string | null | undefined): string[] {
  const tokens = String(raw ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const emails = parseEmails(raw);
  if (tokens.length > 0 && emails.length !== tokens.length) {
    throw new Error("Use valid emails, separated by commas");
  }
  return emails;
}

export function parseChatIds(raw: string | null | undefined): string[] {
  const parts = String(raw ?? "")
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!/^@?[A-Za-z0-9_-]{3,64}$/.test(part) && !/^-?\d{5,20}$/.test(part)) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    out.push(part);
    if (out.length >= 10) break;
  }
  return out;
}

export function parseChatIdsStrict(raw: string | null | undefined): string[] {
  const tokens = String(raw ?? "")
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chats = parseChatIds(raw);
  if (tokens.length > 0 && chats.length !== tokens.length) {
    throw new Error("Use Telegram chat ids, separated by commas");
  }
  return chats;
}

export function parseClockMinutes(value: string | null | undefined): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClockMinutes(total: number) {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function minutesInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function inQuietHours(
  now: Date,
  timeZone: string,
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  const from = parseClockMinutes(start);
  const to = parseClockMinutes(end);
  if (from == null || to == null || from === to) return false;
  const current = minutesInTimeZone(now, timeZone);
  if (from < to) return current >= from && current < to;
  return current >= from || current < to;
}

export function applyQuietHours(
  events: NotifyEvent[],
  input: {
    now?: Date;
    timeZone: string;
    start?: string | null;
    end?: string | null;
    allow?: string | string[] | null;
  },
): NotifyEvent[] {
  if (!inQuietHours(input.now ?? new Date(), input.timeZone, input.start, input.end)) {
    return events;
  }
  const allow = new Set(parseNotifyList(input.allow));
  return events.filter((event) => allow.has(event));
}

export function serializeEmails(emails: string[]) {
  return parseEmails(emails.join(",")).join(", ");
}

export function serializeChatIds(chats: string[]) {
  return parseChatIds(chats.join(",")).join(", ");
}

export function looksLikeSlackWebhook(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export { serializeNotifyList };
