export type CronMode = "minutes" | "hourly" | "daily" | "weekdays" | "weekly" | "custom";

export type CronDraft = {
  mode: CronMode;
  every: number;
  hour: number;
  minute: number;
  weekday: number;
  raw: string;
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function clampCronPart(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function emptyCronDraft(raw = "*/5 * * * *"): CronDraft {
  return { mode: "minutes", every: 5, hour: 9, minute: 0, weekday: 1, raw };
}

export function buildCron(draft: CronDraft) {
  const every = clampCronPart(draft.every, 1, 59, 5);
  const hour = clampCronPart(draft.hour, 0, 23, 9);
  const minute = clampCronPart(draft.minute, 0, 59, 0);
  const weekday = clampCronPart(draft.weekday, 0, 6, 1);
  if (draft.mode === "minutes") return every === 1 ? "* * * * *" : `*/${every} * * * *`;
  if (draft.mode === "hourly") return `${minute} * * * *`;
  if (draft.mode === "daily") return `${minute} ${hour} * * *`;
  if (draft.mode === "weekdays") return `${minute} ${hour} * * 1-5`;
  if (draft.mode === "weekly") return `${minute} ${hour} * * ${weekday}`;
  return draft.raw.trim() || "*/5 * * * *";
}

export function parseCronDraft(expr: string): CronDraft {
  const raw = String(expr ?? "").trim();
  const parts = raw.split(/\s+/);
  const draft = emptyCronDraft(raw || "*/5 * * * *");
  if (parts.length !== 5) {
    return { ...draft, mode: "custom", raw: raw || draft.raw };
  }
  const [minute, hour, day, month, weekday] = parts;
  if (day !== "*" || month !== "*") {
    return { ...draft, mode: "custom", raw };
  }
  if (minute === "*" && hour === "*" && weekday === "*") {
    return { ...draft, mode: "minutes", every: 1, raw };
  }
  const step = minute?.match(/^\*\/(\d+)$/);
  if (step && hour === "*" && weekday === "*") {
    return { ...draft, mode: "minutes", every: clampCronPart(Number(step[1]), 1, 59, 5), raw };
  }
  if (/^\d+$/.test(minute ?? "") && hour === "*" && weekday === "*") {
    return { ...draft, mode: "hourly", minute: clampCronPart(Number(minute), 0, 59, 0), raw };
  }
  if (/^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "") && weekday === "1-5") {
    return {
      ...draft,
      mode: "weekdays",
      minute: clampCronPart(Number(minute), 0, 59, 0),
      hour: clampCronPart(Number(hour), 0, 23, 9),
      raw,
    };
  }
  if (/^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "") && weekday === "*") {
    return {
      ...draft,
      mode: "daily",
      minute: clampCronPart(Number(minute), 0, 59, 0),
      hour: clampCronPart(Number(hour), 0, 23, 9),
      raw,
    };
  }
  if (/^\d+$/.test(minute ?? "") && /^\d+$/.test(hour ?? "") && /^\d+$/.test(weekday ?? "")) {
    const dayNum = Number(weekday);
    if ((WEEKDAYS as readonly number[]).includes(dayNum)) {
      return {
        ...draft,
        mode: "weekly",
        minute: clampCronPart(Number(minute), 0, 59, 0),
        hour: clampCronPart(Number(hour), 0, 23, 9),
        weekday: dayNum,
        raw,
      };
    }
  }
  return { ...draft, mode: "custom", raw };
}
