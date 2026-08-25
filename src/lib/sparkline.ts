export type SparkDay = { ok: number; bad: number };

export function emptySpark(days = 7): SparkDay[] {
  return Array.from({ length: days }, () => ({ ok: 0, bad: 0 }));
}

export function sparkRate(day: SparkDay) {
  const total = day.ok + day.bad;
  if (total === 0) return null;
  return day.ok / total;
}

export function sparkExceeded(days: SparkDay[], failPerDay: number) {
  if (failPerDay <= 0) return false;
  const today = days[days.length - 1];
  return Boolean(today && today.bad >= failPerDay);
}
