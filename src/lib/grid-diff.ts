import type { ResponseGrid } from "./response-grid";

export type DiffCell = { value: string; changed: boolean };
export type DiffRow = { cells: DiffCell[]; changed: boolean };

export function diffGrids(current: ResponseGrid, previous: ResponseGrid | null) {
  const columns = current.columns;
  if (!previous) {
    return {
      columns,
      rows: current.rows.map((row) => ({
        changed: false,
        cells: row.map((value) => ({ value, changed: false })),
      })) as DiffRow[],
      changedCount: 0,
    };
  }
  const prevIndex = new Map(previous.columns.map((column, index) => [column, index]));
  const max = Math.max(current.rows.length, previous.rows.length);
  const rows: DiffRow[] = [];
  let changedCount = 0;
  for (let index = 0; index < max; index += 1) {
    const currentRow = current.rows[index] ?? [];
    const previousRow = previous.rows[index] ?? [];
    const cells = columns.map((column, col) => {
      const value = currentRow[col] ?? "";
      const old = previousRow[prevIndex.get(column) ?? -1] ?? "";
      const changed = value !== old;
      if (changed) changedCount += 1;
      return { value, changed };
    });
    rows.push({ cells, changed: cells.some((cell) => cell.changed) });
  }
  return { columns, rows, changedCount };
}
