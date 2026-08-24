import { describe, expect, it } from "vitest";
import { getNextRunAt, previewRuns, validateCron } from "./cron";

describe("cron helpers", () => {
  it("parses a 5-field expression", () => {
    expect(() => validateCron("*/5 * * * *", "UTC")).not.toThrow();
  });

  it("rejects an invalid expression", () => {
    expect(() => validateCron("not-a-cron", "UTC")).toThrow();
  });

  it("returns a next run in the future", () => {
    const from = new Date("2026-08-24T12:00:00.000Z");
    const next = getNextRunAt("0 * * * *", "UTC", from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });

  it("previews several upcoming fires", () => {
    const from = new Date("2026-08-24T12:00:00.000Z");
    const runs = previewRuns("0 * * * *", "UTC", 3, from);
    expect(runs).toHaveLength(3);
    expect(runs[1]!.getTime()).toBeGreaterThan(runs[0]!.getTime());
  });
});
