import { describe, expect, it } from "vitest";
import {
  applyGridQuery,
  columnValueCounts,
  filterChipLabel,
  filterGrid,
  inFilterForSelection,
  parseResponseDatasets,
  parseResponseGrid,
} from "./response-grid";

describe("parseResponseGrid", () => {
  it("turns an array of objects into columns", () => {
    const grid = parseResponseGrid(
      JSON.stringify([
        { id: 1, name: "Athens" },
        { id: 2, name: "Patras", extra: true },
      ]),
    );
    expect(grid.source).toBe("json-table");
    expect(grid.columns).toEqual(["id", "name", "extra"]);
    expect(grid.rows[0]).toEqual(["1", "Athens", ""]);
    expect(grid.rows[1]).toEqual(["2", "Patras", "true"]);
  });

  it("unwraps a nested data array", () => {
    const grid = parseResponseGrid(JSON.stringify({ data: [{ sku: "A", qty: 3 }] }));
    expect(grid.title).toBe("data");
    expect(grid.columns).toEqual(["sku", "qty"]);
    expect(grid.rows).toEqual([["A", "3"]]);
  });

  it("maps a JSON object to field/value pairs", () => {
    const grid = parseResponseGrid(JSON.stringify({ ok: true, count: 2 }));
    expect(grid.source).toBe("json-pairs");
    expect(grid.rows).toEqual([
      ["ok", "true"],
      ["count", "2"],
    ]);
  });

  it("reads an HTML table", () => {
    const grid = parseResponseGrid(
      "<table><tr><th>City</th><th>Code</th></tr><tr><td>Athens</td><td>ATH</td></tr></table>",
    );
    expect(grid.source).toBe("html");
    expect(grid.columns).toEqual(["City", "Code"]);
    expect(grid.rows).toEqual([["Athens", "ATH"]]);
  });

  it("reads CSV with a header row", () => {
    const grid = parseResponseGrid("name,qty\nalpha,1\nbeta,2");
    expect(grid.source).toBe("csv");
    expect(grid.columns).toEqual(["name", "qty"]);
    expect(grid.rows).toEqual([
      ["alpha", "1"],
      ["beta", "2"],
    ]);
  });

  it("filters rows", () => {
    const grid = parseResponseGrid(JSON.stringify([{ name: "Athens" }, { name: "Patras" }]));
    expect(filterGrid(grid, "pat").rows).toEqual([["Patras"]]);
  });

  it("keeps every JSON row", () => {
    const rows = Array.from({ length: 650 }, (_, index) => ({ id: index, name: `row-${index}` }));
    const grid = parseResponseGrid(JSON.stringify(rows));
    expect(grid.rows).toHaveLength(650);
    expect(grid.rows[649]).toEqual(["649", "row-649"]);
  });

  it("flattens nested object fields", () => {
    const grid = parseResponseGrid(JSON.stringify([{ user: { name: "Ada" }, qty: 2 }]));
    expect(grid.columns).toEqual(["user.name", "qty"]);
    expect(grid.rows[0]).toEqual(["Ada", "2"]);
  });

  it("sorts and filters by column", () => {
    const grid = parseResponseGrid(
      JSON.stringify([
        { name: "Patras", qty: 2 },
        { name: "Athens", qty: 10 },
      ]),
    );
    const sorted = applyGridQuery(grid, { sort: { column: "qty", dir: "desc" } });
    expect(sorted.rows[0]).toEqual(["Athens", "10"]);
    expect(sorted.origin[0]).toBe(1);
    const filtered = applyGridQuery(grid, {
      filters: [{ id: "1", column: "name", op: "contains", value: "ath" }],
    });
    expect(filtered.rows).toEqual([["Athens", "10"]]);
  });

  it("exposes every nested JSON table as a dataset", () => {
    const datasets = parseResponseDatasets(
      JSON.stringify({
        ok: true,
        users: [{ id: 1, name: "Ada" }],
        orders: [
          { id: 9, total: 12 },
          { id: 8, total: 4 },
        ],
      }),
    );
    expect(datasets.map((item) => item.id)).toEqual(["orders", "users", "_fields"]);
    expect(datasets[0]?.grid.rows).toHaveLength(2);
    expect(datasets[2]?.grid.rows).toEqual([["ok", "true"]]);
  });
});

describe("filterChipLabel", () => {
  it("summarizes a filter for the chip strip", () => {
    expect(filterChipLabel({ column: "SKU", op: "contains", value: "SS22" })).toBe(
      "SKU contains SS22",
    );
    expect(filterChipLabel({ column: "STOCK", op: "empty", value: "ignored" })).toBe(
      "STOCK is empty",
    );
    expect(filterChipLabel({ column: "VAT", op: "gt", value: "  " })).toBe("VAT greater than");
    expect(filterChipLabel({ column: "SKU", op: "in", value: "", values: ["A", "B", ""] })).toBe(
      "SKU · 3 values",
    );
    expect(filterChipLabel({ column: "SKU", op: "in", value: "", values: ["SS22"] })).toBe(
      "SKU is SS22",
    );
  });
});

describe("in filters and value counts", () => {
  it("filters a column to selected values including blanks", () => {
    const grid = parseResponseGrid(
      JSON.stringify([
        { sku: "A", qty: 1 },
        { sku: "B", qty: 2 },
        { sku: "", qty: 3 },
      ]),
    );
    const filtered = applyGridQuery(grid, {
      filters: [{ id: "1", column: "sku", op: "in", value: "", values: ["A", ""] }],
    });
    expect(filtered.rows.map((row) => row[0])).toEqual(["A", ""]);
  });

  it("counts unique values and drops the in-filter when everything is selected", () => {
    const grid = parseResponseGrid(
      JSON.stringify([
        { color: "red" },
        { color: "red" },
        { color: "blue" },
        { color: "" },
      ]),
    );
    const counts = columnValueCounts(grid, "color");
    expect(counts.unique).toBe(3);
    expect(counts.items[0]).toEqual({ value: "red", count: 2 });
    expect(inFilterForSelection("color", ["red", "blue", ""], ["red", "blue", ""])).toBeNull();
    expect(inFilterForSelection("color", ["red"], ["red", "blue", ""])?.values).toEqual(["red"]);
  });
});
