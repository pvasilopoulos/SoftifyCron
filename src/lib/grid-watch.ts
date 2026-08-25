import { FILTER_OPS, matchFilter, parseResponseGrid, type FilterOp } from "./response-grid";

export type GridWatch = {
  id: string;
  column: string;
  op: FilterOp;
  value: string;
};

export function parseGridWatches(raw: unknown): GridWatch[] {
  if (!Array.isArray(raw)) return [];
  const out: GridWatch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const op = String(row.op ?? "");
    if (!FILTER_OPS.includes(op as FilterOp)) continue;
    const id = typeof row.id === "string" && row.id ? row.id : `w_${out.length}`;
    const column = typeof row.column === "string" ? row.column.trim() : "";
    if (!column) continue;
    out.push({
      id,
      column,
      op: op as FilterOp,
      value: typeof row.value === "string" ? row.value : "",
    });
    if (out.length >= 20) break;
  }
  return out;
}

export type WatchHit = { watch: GridWatch; rows: number; sample: string };

export function evalGridWatches(body: string | null | undefined, rawWatches: unknown): WatchHit[] {
  const watches = parseGridWatches(rawWatches);
  if (!body || watches.length === 0) return [];
  const grid = parseResponseGrid(body);
  const hits: WatchHit[] = [];
  for (const watch of watches) {
    const col = grid.columns.indexOf(watch.column);
    if (col < 0) continue;
    let rows = 0;
    let sample = "";
    for (const row of grid.rows) {
      const cell = row[col] ?? "";
      if (!matchFilter(cell, watch.op, watch.value)) continue;
      rows += 1;
      if (!sample) sample = cell.slice(0, 80);
    }
    if (rows > 0) hits.push({ watch, rows, sample });
  }
  return hits;
}

export function watchSummary(hits: WatchHit[]) {
  return hits
    .map((hit) => `${hit.watch.column} ${hit.watch.op} ${hit.watch.value || "∅"} × ${hit.rows}`)
    .join("; ");
}
