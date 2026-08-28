import { describe, expect, it } from "vitest";
import {
  autosizeColumn,
  autosizeColumns,
  clampColWidth,
  columnIsEmptyOrZero,
  columnLooksNumeric,
  columnStats,
  emptyOrZeroColumns,
  formatStat,
  highlightParts,
  moveColumnTo,
  parseColWidths,
  stepGridCell,
} from "./grid-layout";

describe("grid layout", () => {
  it("clamps and parses column widths", () => {
    expect(clampColWidth(10)).toBe(72);
    expect(clampColWidth(900)).toBe(720);
    expect(parseColWidths({ sku: 180, bad: "nope", "": 100 })).toEqual({ sku: 180 });
  });

  it("autosizes from header and cells", () => {
    const width = autosizeColumn("qty", ["1", "12", "a reasonably long cell value"]);
    expect(width).toBeGreaterThan(72);
    expect(width).toBeLessThanOrEqual(720);
    expect(autosizeColumns(["id", "name"], [["1", "Ada"], ["2", "Grace"]]).id).toBeGreaterThan(0);
    expect(autosizeColumn("DiscountedPrice", ["12.5"])).toBeGreaterThan(
      autosizeColumn("sku", ["12.5"]),
    );
  });

  it("detects numeric columns and highlights search hits", () => {
    expect(columnLooksNumeric(["1", "2", "3", "4"])).toBe(true);
    expect(columnLooksNumeric(["Athens", "Patras", "Volos"])).toBe(false);
    expect(highlightParts("SoftifyCron grid", "grid")).toEqual([
      { text: "SoftifyCron ", hit: false },
      { text: "grid", hit: true },
    ]);
  });

  it("moves a column to an index", () => {
    expect(moveColumnTo(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveColumnTo(["a", "b", "c"], "a", 2)).toEqual(["b", "c", "a"]);
  });

  it("steps the active cell like a spreadsheet", () => {
    expect(stepGridCell(0, 0, "left", 3, 4)).toEqual({ row: 0, col: 0 });
    expect(stepGridCell(1, 0, "left", 3, 4)).toEqual({ row: 0, col: 2 });
    expect(stepGridCell(0, 2, "right", 3, 4)).toEqual({ row: 1, col: 0 });
    expect(stepGridCell(3, 1, "down", 3, 4)).toEqual({ row: 3, col: 1 });
    expect(stepGridCell(3, 2, "right", 3, 4)).toEqual({ row: 3, col: 2 });
    expect(stepGridCell(2, 1, "home", 3, 4)).toEqual({ row: 2, col: 0 });
    expect(stepGridCell(2, 1, "last", 3, 4)).toEqual({ row: 3, col: 2 });
  });
});

describe("column stats and empty columns", () => {
  it("sums numeric cells and ignores blanks", () => {
    const stats = columnStats(
      [
        ["10", "a"],
        ["", "b"],
        ["2.5", "c"],
        ["0", "d"],
      ],
      0,
    );
    expect(stats).toEqual({ sum: 12.5, avg: 12.5 / 3, count: 3, empty: 1, numeric: true });
    expect(formatStat(3)).toBe("3");
    expect(formatStat(1.25)).toBe("1.25");
  });

  it("treats blank and zero columns as empty", () => {
    expect(columnIsEmptyOrZero(["", "0", "0.0"])).toBe(true);
    expect(columnIsEmptyOrZero(["", "2"])).toBe(false);
    expect(emptyOrZeroColumns(["sku", "gift"], [["A", "0"], ["B", ""]])).toEqual(["gift"]);
  });
});
