import { describe, expect, it } from "vitest";
import { greekHolidaySet, isGreekHoliday, orthodoxEaster } from "./holidays-gr";
import { checkAssertions, readJsonPath } from "./assert-response";
import { changedSourceRows, diffGrids } from "./grid-diff";
import { isOverdueSlot, nextAllowedFire } from "./schedule-policy";

describe("greek holidays", () => {
  it("computes Orthodox Easter 2026", () => {
    expect(orthodoxEaster(2026)).toBe("2026-04-12");
    expect(isGreekHoliday("2026-03-25")).toBe(true);
    expect(greekHolidaySet(2026).has("2026-04-13")).toBe(true);
  });
});

describe("assertions", () => {
  it("reads dotted and indexed JSON paths", () => {
    const data = { data: [{ sku: "A" }], ok: true };
    expect(readJsonPath(data, "$.ok")).toBe(true);
    expect(readJsonPath(data, "data.0.sku")).toBe("A");
  });

  it("fails on status, contains, and path mismatch", () => {
    expect(checkAssertions("{}", 500, { assertStatus: 200 })).toMatch(/HTTP 200/);
    expect(checkAssertions("hello", 200, { assertContains: "ok" })).toMatch(/contain/);
    expect(checkAssertions('{"ok":false}', 200, { assertJsonPath: "ok", assertEquals: "true" })).toMatch(
      /expected/,
    );
    expect(checkAssertions('{"ok":true}', 200, { assertJsonPath: "ok", assertEquals: "true" })).toBeNull();
  });
});

describe("grid diff", () => {
  it("marks changed cells", () => {
    const diff = diffGrids(
      { columns: ["name", "qty"], rows: [["A", "2"]], source: "json-table" },
      { columns: ["name", "qty"], rows: [["A", "1"]], source: "json-table" },
    );
    expect(diff.changedCount).toBe(1);
    expect(diff.rows[0]?.cells[1]?.changed).toBe(true);
    expect(diff.rows[0]?.cells[1]?.previous).toBe("1");
    expect(diff.rows[0]?.cells[1]?.value).toBe("2");
  });

  it("drops unchanged rows for the change-only view", () => {
    const current = {
      columns: ["name", "qty"],
      rows: [
        ["A", "1"],
        ["B", "3"],
      ],
      source: "json-table" as const,
    };
    const previous = {
      columns: ["name", "qty"],
      rows: [
        ["A", "1"],
        ["B", "2"],
      ],
      source: "json-table" as const,
    };
    const filtered = changedSourceRows(current, diffGrids(current, previous));
    expect(filtered.grid.rows).toEqual([["B", "3"]]);
    expect(filtered.origin).toEqual([1]);
  });
});

describe("overdue slots", () => {
  it("treats a slot more than 1.5 intervals late as overdue", () => {
    const scheduled = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T00:20:00Z");
    expect(isOverdueSlot("*/5 * * * *", "UTC", scheduled, now)).toBe(true);
    expect(isOverdueSlot("*/5 * * * *", "UTC", scheduled, new Date("2026-01-01T00:02:00Z"))).toBe(
      false,
    );
  });
});

describe("next allowed fire", () => {
  it("jumps a weekend for skipWeekends jobs", () => {
    const from = new Date("2026-08-22T00:00:00Z"); // Saturday
    const next = nextAllowedFire("0 * * * *", { timezone: "UTC", skipWeekends: true }, false, from);
    expect(next.getUTCDay()).not.toBe(0);
    expect(next.getUTCDay()).not.toBe(6);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });
});
