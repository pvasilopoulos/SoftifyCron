import type { ResponseGrid } from "./response-grid";

export type DiffCell = { value: string; previous: string; changed: boolean };
export type DiffRow = { cells: DiffCell[]; changed: boolean };

export function diffHoverText(cell: DiffCell) {
  return `Was: ${cell.previous || "—"}\nNow: ${cell.value || "—"}`;
}

export function diffGrids(current: ResponseGrid, previous: ResponseGrid | null) {
  const columns = current.columns;
  if (!previous) {
    return {
      columns,
      rows: current.rows.map((row) => ({
        changed: false,
        cells: row.map((value) => ({ value, previous: value, changed: false })),
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
      const previousValue = previousRow[prevIndex.get(column) ?? -1] ?? "";
      const changed = value !== previousValue;
      if (changed) changedCount += 1;
      return { value, previous: previousValue, changed };
    });
    rows.push({ cells, changed: cells.some((cell) => cell.changed) });
  }
  return { columns, rows, changedCount };
}

export function changedSourceRows(grid: ResponseGrid, diff: { rows: DiffRow[] } | null) {
  if (!diff) return { grid, origin: grid.rows.map((_, index) => index) };
  const origin: number[] = [];
  const rows: string[][] = [];
  grid.rows.forEach((row, index) => {
    if (!diff.rows[index]?.changed) return;
    origin.push(index);
    rows.push(row);
  });
  return { grid: { ...grid, rows }, origin };
}

export type GridCellPos = { row: number; col: number };

export function listChangedViewCells(
  view: { columns: string[]; origin: number[] },
  sourceColumns: string[],
  workingOrigin: number[],
  diff: { rows: DiffRow[] } | null,
): GridCellPos[] {
  if (!diff) return [];
  const cells: GridCellPos[] = [];
  const sourceIndexOf = (viewRow: number) => {
    const workingIndex = view.origin[viewRow] ?? viewRow;
    return workingOrigin[workingIndex] ?? workingIndex;
  };
  for (let row = 0; row < view.origin.length; row += 1) {
    const sourceRow = sourceIndexOf(row);
    const diffRow = diff.rows[sourceRow];
    if (!diffRow) continue;
    for (let col = 0; col < view.columns.length; col += 1) {
      const sourceCol = sourceColumns.indexOf(view.columns[col] ?? "");
      if (sourceCol < 0) continue;
      if (diffRow.cells[sourceCol]?.changed) cells.push({ row, col });
    }
  }
  return cells;
}

export function stepChangedCell(cells: GridCellPos[], current: GridCellPos | null, dir: 1 | -1) {
  if (!cells.length) return null;
  if (!current) return dir > 0 ? cells[0]! : cells[cells.length - 1]!;
  const at = cells.findIndex((cell) => cell.row === current.row && cell.col === current.col);
  if (at >= 0) {
    return cells[(at + dir + cells.length) % cells.length]!;
  }
  if (dir > 0) {
    return (
      cells.find((cell) => cell.row > current.row || (cell.row === current.row && cell.col > current.col)) ??
      cells[0]!
    );
  }
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]!;
    if (cell.row < current.row || (cell.row === current.row && cell.col < current.col)) return cell;
  }
  return cells[cells.length - 1]!;
}
