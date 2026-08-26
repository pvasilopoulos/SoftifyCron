import { parseResponseGrid, parseCellNumber } from "./response-grid";

export type SeriesPoint = { at: string; value: number };

export function extractColumnSeries(
  runs: Array<{ startedAt: Date | string; responseBody: string | null }>,
  column: string,
  limit = 60,
): SeriesPoint[] {
  const name = column.trim().toLowerCase();
  if (!name) return [];
  const out: SeriesPoint[] = [];
  for (const run of runs.slice(0, limit)) {
    const grid = parseResponseGrid(run.responseBody);
    const index = grid.columns.findIndex((item) => item.toLowerCase() === name);
    if (index < 0) continue;
    let picked: number | null = null;
    for (const row of grid.rows) {
      const n = parseCellNumber(row[index] ?? "");
      if (n != null) {
        picked = n;
        break;
      }
    }
    if (picked == null) continue;
    const at = new Date(run.startedAt);
    if (!Number.isFinite(at.getTime())) continue;
    out.push({ at: at.toISOString(), value: picked });
  }
  return out.sort((left, right) => left.at.localeCompare(right.at));
}

export function seriesExtent(points: SeriesPoint[]) {
  if (points.length === 0) return { min: 0, max: 1 };
  let min = points[0]!.value;
  let max = min;
  for (const point of points) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
  }
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}
