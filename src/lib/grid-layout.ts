import { parseCellNumber } from "./response-grid";

export const COL_MIN = 72;
export const COL_MAX = 720;

export function clampColWidth(n: number) {
  if (!Number.isFinite(n)) return COL_MIN;
  return Math.min(COL_MAX, Math.max(COL_MIN, Math.round(n)));
}

export function parseColWidths(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const name = key.trim();
    if (!name) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) continue;
    out[name] = clampColWidth(n);
    if (Object.keys(out).length >= 200) break;
  }
  return out;
}

export function measureTextWidth(text: string) {
  const sample = String(text ?? "").slice(0, 120);
  return clampColWidth(28 + Math.min(sample.length, 80) * 7.2);
}

export function measureHeaderWidth(text: string) {
  const sample = String(text ?? "").slice(0, 48);
  return clampColWidth(56 + Math.min(sample.length, 48) * 9.6);
}

export function autosizeColumn(name: string, cells: string[]) {
  let width = measureHeaderWidth(name);
  for (const cell of cells.slice(0, 80)) {
    width = Math.max(width, measureTextWidth(cell));
  }
  return clampColWidth(width);
}

export function autosizeColumns(columns: string[], rows: string[][]) {
  const widths: Record<string, number> = {};
  for (let index = 0; index < columns.length; index += 1) {
    const name = columns[index]!;
    widths[name] = autosizeColumn(
      name,
      rows.slice(0, 80).map((row) => row[index] ?? ""),
    );
  }
  return widths;
}

export function columnLooksNumeric(cells: string[]) {
  let nums = 0;
  let seen = 0;
  for (const cell of cells.slice(0, 40)) {
    if (!cell.trim()) continue;
    seen += 1;
    if (parseCellNumber(cell) != null) nums += 1;
  }
  return seen >= 3 && nums / seen >= 0.8;
}

export function highlightParts(text: string, query: string) {
  const value = text ?? "";
  const needle = query.trim();
  if (!needle || !value) return [{ text: value, hit: false }];
  const hay = value.toLowerCase();
  const q = needle.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    const at = hay.indexOf(q, cursor);
    if (at < 0) {
      parts.push({ text: value.slice(cursor), hit: false });
      break;
    }
    if (at > cursor) parts.push({ text: value.slice(cursor, at), hit: false });
    parts.push({ text: value.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
  }
  return parts;
}

export function moveColumnTo(columns: string[], name: string, toIndex: number) {
  const index = columns.indexOf(name);
  if (index < 0) return columns;
  const copy = [...columns];
  const [item] = copy.splice(index, 1);
  const next = Math.max(0, Math.min(copy.length, toIndex));
  copy.splice(next, 0, item!);
  return copy;
}

export type GridStep = "left" | "right" | "up" | "down" | "home" | "end" | "first" | "last";

export function stepGridCell(
  row: number,
  col: number,
  step: GridStep,
  colCount: number,
  rowCount: number,
) {
  if (colCount <= 0 || rowCount <= 0) return { row: 0, col: 0 };
  let nextRow = row;
  let nextCol = col;
  if (step === "left") {
    nextCol -= 1;
    if (nextCol < 0) {
      if (nextRow > 0) {
        nextCol = colCount - 1;
        nextRow -= 1;
      } else {
        nextCol = 0;
      }
    }
  } else if (step === "right") {
    nextCol += 1;
    if (nextCol >= colCount) {
      if (nextRow < rowCount - 1) {
        nextCol = 0;
        nextRow += 1;
      } else {
        nextCol = colCount - 1;
      }
    }
  } else if (step === "up") nextRow -= 1;
  else if (step === "down") nextRow += 1;
  else if (step === "home") nextCol = 0;
  else if (step === "end") nextCol = colCount - 1;
  else if (step === "first") {
    nextRow = 0;
    nextCol = 0;
  } else if (step === "last") {
    nextRow = rowCount - 1;
    nextCol = colCount - 1;
  }
  return {
    row: Math.max(0, Math.min(rowCount - 1, nextRow)),
    col: Math.max(0, Math.min(colCount - 1, nextCol)),
  };
}
