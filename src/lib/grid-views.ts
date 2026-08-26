import { parseColWidths } from "./grid-layout";

export type GridView = {
  id: string;
  name: string;
  visible?: string[];
  freeze?: boolean;
  compact?: boolean;
  wrap?: boolean;
  pageSize?: number;
  widths?: Record<string, number>;
};

export function parseGridViews(raw: unknown): GridView[] {
  if (!Array.isArray(raw)) return [];
  const out: GridView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.name !== "string" || !row.id || !row.name) continue;
    const widths = parseColWidths(row.widths);
    const visible = Array.isArray(row.visible)
      ? row.visible.filter((column): column is string => typeof column === "string" && Boolean(column))
      : undefined;
    const view: GridView = { id: row.id, name: row.name };
    if (visible?.length) view.visible = visible;
    if (typeof row.freeze === "boolean") view.freeze = row.freeze;
    if (typeof row.compact === "boolean") view.compact = row.compact;
    if (typeof row.wrap === "boolean") view.wrap = row.wrap;
    if (typeof row.pageSize === "number" && Number.isFinite(row.pageSize)) view.pageSize = row.pageSize;
    if (Object.keys(widths).length) view.widths = widths;
    out.push(view);
    if (out.length >= 20) break;
  }
  return out;
}
