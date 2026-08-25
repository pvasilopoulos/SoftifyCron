import { localMinutes, localWeekday } from "./holidays-gr";
import { parseClockMinutes } from "./notify-policy";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type MaintWindow = {
  enabled?: boolean;
  startWd?: number;
  startHm?: string | null;
  endWd?: number;
  endHm?: string | null;
  muteOnly?: boolean;
};

export function weekMinutes(at: Date, timeZone: string) {
  return localWeekday(at, timeZone) * 1440 + localMinutes(at, timeZone);
}

export function windowStartMinutes(win: MaintWindow) {
  const clock = parseClockMinutes(win.startHm ?? "22:00") ?? 22 * 60;
  const day = Math.min(6, Math.max(0, Math.trunc(win.startWd ?? 5)));
  return day * 1440 + clock;
}

export function windowEndMinutes(win: MaintWindow) {
  const clock = parseClockMinutes(win.endHm ?? "07:00") ?? 7 * 60;
  const day = Math.min(6, Math.max(0, Math.trunc(win.endWd ?? 1)));
  return day * 1440 + clock;
}

export function inMaintWindow(at: Date, timeZone: string, win: MaintWindow | null | undefined) {
  if (!win?.enabled) return false;
  const now = weekMinutes(at, timeZone);
  const start = windowStartMinutes(win);
  const end = windowEndMinutes(win);
  if (start === end) return true;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

export function maintAction(
  at: Date,
  timeZone: string,
  tenant: MaintWindow | null | undefined,
  group: MaintWindow | null | undefined,
): { skip: boolean; mute: boolean } {
  const hits = [tenant, group].filter((win) => inMaintWindow(at, timeZone, win));
  if (hits.length === 0) return { skip: false, mute: false };
  const skip = hits.some((win) => !win?.muteOnly);
  return { skip, mute: !skip };
}

export function maintFromRow(row: {
  maintEnabled?: boolean;
  maintStartWd?: number;
  maintStartHm?: string | null;
  maintEndWd?: number;
  maintEndHm?: string | null;
  maintMuteOnly?: boolean;
} | null | undefined): MaintWindow {
  return {
    enabled: Boolean(row?.maintEnabled),
    startWd: row?.maintStartWd ?? 5,
    startHm: row?.maintStartHm ?? "22:00",
    endWd: row?.maintEndWd ?? 1,
    endHm: row?.maintEndHm ?? "07:00",
    muteOnly: Boolean(row?.maintMuteOnly),
  };
}
