export const NOTIFY_EVENTS = [
  "failure",
  "timeout",
  "blocked",
  "success",
  "recovery",
  "pause",
  "missed",
  "slow",
  "escalate",
  "watch",
  "slo",
] as const;

export type NotifyEvent = (typeof NOTIFY_EVENTS)[number];
export type NotifyChannel = "email" | "telegram" | "webhook" | "slack";

export const NOTIFY_EVENT_LABELS: Record<NotifyEvent, { title: string; hint: string }> = {
  failure: { title: "Fails", hint: "HTTP error or unexpected exception" },
  timeout: { title: "Times out", hint: "No response before the timeout" },
  blocked: { title: "Is blocked", hint: "SSRF guard, private host, or unknown secret" },
  success: { title: "Succeeds", hint: "Every healthy run" },
  recovery: { title: "Recovers", hint: "First success after consecutive failures" },
  pause: { title: "Auto-pauses", hint: "Paused after N consecutive failures" },
  missed: { title: "Misses a beat", hint: "Heartbeat went silent, or a schedule fired late" },
  slow: { title: "Runs slow", hint: "Duration spiked above the job threshold" },
  escalate: { title: "Escalates", hint: "Still failing after retries / escalate-after count" },
  watch: { title: "Grid watch hits", hint: "A saved watch rule matched cells in the response" },
  slo: { title: "Breaks SLO", hint: "Too many failed runs in 24 hours" },
};

export const DEFAULT_NOTIFY_EMAIL_ON = "failure,timeout,blocked,pause,recovery,missed,slow,escalate,watch,slo";
export const DEFAULT_NOTIFY_TELEGRAM_ON = "failure,timeout,blocked,pause,recovery,missed,slow,escalate,watch,slo";
export const DEFAULT_NOTIFY_WEBHOOK_ON = "failure,timeout,blocked,pause,missed,escalate,watch,slo";
export const DEFAULT_NOTIFY_SLACK_ON = "failure,timeout,blocked,pause,recovery,missed,slow,escalate,watch,slo";
export const DEFAULT_QUIET_ALLOW = "failure,timeout,blocked,pause,missed,escalate,slo";
export const LATE_SCHEDULE_MS = 120_000;

const EVENT_SET = new Set<string>(NOTIFY_EVENTS);

export function parseNotifyList(raw: string | string[] | null | undefined): NotifyEvent[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase());
  const seen = new Set<NotifyEvent>();
  for (const part of parts) {
    if (EVENT_SET.has(part)) seen.add(part as NotifyEvent);
  }
  return NOTIFY_EVENTS.filter((event) => seen.has(event));
}

export function serializeNotifyList(events: Iterable<string>): string {
  return parseNotifyList([...events]).join(",");
}

export function channelHasEvent(list: string | string[] | null | undefined, event: NotifyEvent) {
  return parseNotifyList(list).includes(event);
}

export function channelMatches(list: string | string[] | null | undefined, events: NotifyEvent[]) {
  const enabled = new Set(parseNotifyList(list));
  return events.some((event) => enabled.has(event));
}

export function eventsForRun(input: {
  status: "SUCCESS" | "FAILED" | "TIMEOUT" | "BLOCKED" | string;
  previousFailures: number;
  paused?: boolean;
  lateMs?: number;
  slow?: boolean;
  escalate?: boolean;
  watch?: boolean;
  slo?: boolean;
}): NotifyEvent[] {
  const events: NotifyEvent[] = [];
  if (input.status === "SUCCESS") {
    events.push(input.previousFailures > 0 ? "recovery" : "success");
  } else if (input.status === "TIMEOUT") {
    events.push("timeout");
  } else if (input.status === "BLOCKED") {
    events.push("blocked");
  } else if (input.status === "MISSED") {
    events.push("missed");
  } else {
    events.push("failure");
  }
  if (input.paused) events.push("pause");
  if ((input.lateMs ?? 0) >= LATE_SCHEDULE_MS && !events.includes("missed")) {
    events.push("missed");
  }
  if (input.slow) events.push("slow");
  if (input.escalate) events.push("escalate");
  if (input.watch) events.push("watch");
  if (input.slo) events.push("slo");
  return events;
}

export function summarizeNotify(job: {
  notifyEmailOn: string;
  notifyTelegramOn: string;
  notifyWebhookOn: string;
  notifySlackOn?: string;
  notifyUrl: string | null;
}) {
  return NOTIFY_EVENTS.map((event) => {
    const channels: NotifyChannel[] = [];
    if (channelHasEvent(job.notifyEmailOn, event)) channels.push("email");
    if (channelHasEvent(job.notifyTelegramOn, event)) channels.push("telegram");
    if (channelHasEvent(job.notifySlackOn, event)) channels.push("slack");
    if (job.notifyUrl && channelHasEvent(job.notifyWebhookOn, event)) channels.push("webhook");
    return { event, channels };
  }).filter((row) => row.channels.length > 0);
}
