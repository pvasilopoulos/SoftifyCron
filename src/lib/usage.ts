export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export type UsageCounts = {
  jobs: number;
  armed: number;
  failing: number;
  runsMonth: number;
  runsToday: number;
  bodyBytes: number;
  deliveriesMonth: number;
};

export function usagePercents(counts: UsageCounts, caps?: { jobs?: number; runsMonth?: number }) {
  const jobCap = caps?.jobs ?? 0;
  const runCap = caps?.runsMonth ?? 0;
  return {
    jobs: jobCap > 0 ? Math.min(100, Math.round((counts.jobs / jobCap) * 100)) : 0,
    runsMonth: runCap > 0 ? Math.min(100, Math.round((counts.runsMonth / runCap) * 100)) : 0,
  };
}
