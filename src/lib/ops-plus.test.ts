import { describe, expect, it } from "vitest";
import { evalGridWatches, parseGridWatches, watchSummary } from "./grid-watch";
import { currentOncall, mergeOncallEmails, weeksSinceMonday } from "./oncall";
import { jobChain, chainHint } from "./job-chain";
import { emptySpark, sparkExceeded } from "./sparkline";

describe("grid watches", () => {
  it("parses rules and matches rows", () => {
    const watches = parseGridWatches([
      { id: "w1", column: "qty", op: "lt", value: "2" },
      { column: "bad" },
    ]);
    expect(watches).toEqual([{ id: "w1", column: "qty", op: "lt", value: "2" }]);
    const hits = evalGridWatches(
      JSON.stringify([
        { sku: "A", qty: 1 },
        { sku: "B", qty: 5 },
      ]),
      watches,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.rows).toBe(1);
    expect(watchSummary(hits)).toContain("qty lt 2");
  });
});

describe("on-call", () => {
  it("rotates weekly and merges the current person first", () => {
    const roster = "a@x.com, b@x.com";
    const first = currentOncall(roster, "UTC", new Date("2026-08-24T12:00:00Z"));
    const next = currentOncall(roster, "UTC", new Date("2026-08-31T12:00:00Z"));
    expect(first).toBeTruthy();
    expect(next).toBeTruthy();
    expect(first).not.toBe(next);
    expect(mergeOncallEmails(["ops@x.com"], "a@x.com")).toEqual(["a@x.com", "ops@x.com"]);
    expect(weeksSinceMonday(new Date("2026-08-24T12:00:00Z"), "UTC")).toBeGreaterThan(0);
  });
});

describe("job chain", () => {
  it("resolves depends and follow-up around a job", () => {
    const jobs = [
      { id: "a", name: "A", followUpJobId: "b" },
      { id: "b", name: "B", dependsOnJobId: "a", followUpJobId: "c" },
      { id: "c", name: "C", dependsOnJobId: "b" },
    ];
    const chain = jobChain(jobs, "b");
    expect(chain.depends?.id).toBe("a");
    expect(chain.follow?.id).toBe("c");
    expect(chain.upstream.map((job) => job.id)).toEqual(["a"]);
    expect(chain.downstream.map((job) => job.id)).toEqual(["c"]);
  });

  it("builds a short board hint", () => {
    const names = new Map([
      ["a", "A"],
      ["c", "C"],
    ]);
    expect(chainHint({ id: "b", name: "B", dependsOnJobId: "a", followUpJobId: "c" }, names)).toBe(
      "after A · then C",
    );
  });
});

describe("sparkline SLO", () => {
  it("flags when today's failures meet the budget", () => {
    const days = emptySpark(7);
    days[6] = { ok: 1, bad: 3 };
    expect(sparkExceeded(days, 3)).toBe(true);
    expect(sparkExceeded(days, 4)).toBe(false);
    expect(sparkExceeded(days, 0)).toBe(false);
  });
});
