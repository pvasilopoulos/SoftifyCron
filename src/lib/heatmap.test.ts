import { describe, expect, it } from "vitest";
import { failureHeatmap, heatmapMax } from "./heatmap";

describe("failure heatmap", () => {
  it("buckets failing runs by weekday and hour in the workspace timezone", () => {
    const heat = failureHeatmap(
      [
        { startedAt: "2026-08-26T10:15:00.000Z", status: "FAILED" },
        { startedAt: "2026-08-26T10:45:00.000Z", status: "TIMEOUT" },
        { startedAt: "2026-08-26T10:50:00.000Z", status: "SUCCESS" },
        { startedAt: "2026-08-27T08:00:00.000Z", status: "BLOCKED" },
      ],
      "UTC",
    );
    expect(heat).toHaveLength(168);
    const wed10 = heat.find((cell) => cell.weekday === 3 && cell.hour === 10);
    const thu8 = heat.find((cell) => cell.weekday === 4 && cell.hour === 8);
    expect(wed10?.count).toBe(2);
    expect(thu8?.count).toBe(1);
    expect(heatmapMax(heat)).toBe(2);
  });
});
