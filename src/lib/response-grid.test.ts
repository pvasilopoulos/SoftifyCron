import { describe, expect, it } from "vitest";
import { filterGrid, parseResponseGrid } from "./response-grid";

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
});
