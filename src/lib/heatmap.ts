export type HeatCell = { weekday: number; hour: number; count: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function failureHeatmap(
  runs: { startedAt: Date | string; status: string }[],
  timeZone: string,
): HeatCell[] {
  const FAILING = new Set(["FAILED", "TIMEOUT", "BLOCKED"]);
  const hourFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  const counts = new Map<string, number>();
  for (const run of runs) {
    if (!FAILING.has(run.status)) continue;
    const at = new Date(run.startedAt);
    const hour = Number(hourFmt.format(at));
    const weekday = WEEKDAYS.indexOf(weekdayFmt.format(at));
    if (!Number.isFinite(hour) || weekday < 0) continue;
    const key = `${weekday}:${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: HeatCell[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({ weekday, hour, count: counts.get(`${weekday}:${hour}`) ?? 0 });
    }
  }
  return cells;
}

export function heatmapMax(cells: HeatCell[]) {
  return cells.reduce((max, cell) => Math.max(max, cell.count), 0);
}
