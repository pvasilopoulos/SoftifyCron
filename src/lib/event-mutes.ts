import type { NotifyEvent } from "./notify-events";

export type EventMutes = Partial<Record<NotifyEvent, string>>;

export function parseEventMutes(raw: unknown): EventMutes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: EventMutes = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value) out[key as NotifyEvent] = value;
  }
  return out;
}

export function liveMutes(raw: unknown, now = new Date()): Set<NotifyEvent> {
  const mutes = parseEventMutes(raw);
  const live = new Set<NotifyEvent>();
  for (const [event, until] of Object.entries(mutes)) {
    if (until && new Date(until).getTime() > now.getTime()) {
      live.add(event as NotifyEvent);
    }
  }
  return live;
}

export function applyEventMutes<T extends string>(events: T[], raw: unknown, now = new Date()): T[] {
  const muted = liveMutes(raw, now);
  if (muted.size === 0) return events;
  return events.filter((event) => !muted.has(event as NotifyEvent));
}

export function setEventMute(raw: unknown, event: NotifyEvent, hours: number, now = new Date()): EventMutes {
  const next = parseEventMutes(raw);
  if (hours <= 0) {
    delete next[event];
    return next;
  }
  next[event] = new Date(now.getTime() + hours * 3_600_000).toISOString();
  return next;
}
