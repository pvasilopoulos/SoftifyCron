import { describe, expect, it } from "vitest";
import { buildCron, parseCronDraft } from "./cron-builder";
import { certExpiresTooSoon, dnsMatchesExpected, isProbeType, parseProbeTarget } from "./probes";
import { extractColumnSeries } from "./grid-series";
import { isOpenIncident, sortInbox } from "./inbox";
import { formatBytes, summarizeJobCounts, toFiniteCount } from "./usage";
import { hookUrl, newHookToken } from "./inbound";
import { parsePhones } from "./sms";
import { buildWeekCalendar, dayKey } from "./calendar";

describe("cron builder", () => {
  it("builds and round-trips common schedules", () => {
    expect(buildCron({ ...parseCronDraft("*/15 * * * *"), mode: "minutes", every: 15 })).toBe("*/15 * * * *");
    expect(buildCron({ ...parseCronDraft(""), mode: "daily", hour: 9, minute: 0, every: 5, weekday: 1, raw: "" })).toBe(
      "0 9 * * *",
    );
    expect(parseCronDraft("0 9 * * 1-5").mode).toBe("weekdays");
    expect(parseCronDraft("0 9 * * 1").mode).toBe("weekly");
    expect(parseCronDraft("0 0 1 * *").mode).toBe("custom");
  });
});

describe("probes", () => {
  it("parses host:port and https URLs", () => {
    expect(parseProbeTarget("example.com:22", "TCP")).toEqual({ host: "example.com", port: 22 });
    expect(parseProbeTarget("https://example.com", "TLS")).toEqual({ host: "example.com", port: 443 });
    expect(dnsMatchesExpected(["1.2.3.4"], "1.2.3.4")).toBe(true);
    expect(dnsMatchesExpected(["1.2.3.4"], "9.9.9.9")).toBe(false);
    const soon = new Date(Date.now() + 2 * 86_400_000);
    expect(certExpiresTooSoon(soon, 14)).toBe(true);
    expect(certExpiresTooSoon(new Date(Date.now() + 40 * 86_400_000), 14)).toBe(false);
  });
});

describe("grid series", () => {
  it("picks the first numeric cell in a named column", () => {
    const points = extractColumnSeries(
      [
        { startedAt: "2026-08-01T10:00:00.000Z", responseBody: '[{"sku":"A","qty":12}]' },
        { startedAt: "2026-08-02T10:00:00.000Z", responseBody: '[{"sku":"A","qty":8}]' },
      ],
      "qty",
    );
    expect(points.map((item) => item.value)).toEqual([12, 8]);
  });
});

describe("inbox", () => {
  it("hides acknowledged failures until a newer run", () => {
    expect(
      isOpenIncident({
        id: "1",
        name: "Ping",
        lastStatus: "FAILED",
        lastRunAt: "2026-08-01T10:00:00.000Z",
        ackedAt: "2026-08-01T11:00:00.000Z",
        consecutiveFailures: 2,
      }),
    ).toBe(false);
    expect(
      sortInbox([
        {
          id: "a",
          name: "A",
          lastStatus: "FAILED",
          lastRunAt: "2026-08-01T10:00:00.000Z",
          ackedAt: null,
          consecutiveFailures: 1,
        },
        {
          id: "b",
          name: "B",
          lastStatus: "TIMEOUT",
          lastRunAt: "2026-08-01T09:00:00.000Z",
          ackedAt: null,
          consecutiveFailures: 4,
        },
      ]).map((item) => item.id),
    ).toEqual(["b", "a"]);
  });
});

describe("usage inbound sms", () => {
  it("formats bytes, phones, and hook urls", () => {
    expect(toFiniteCount(BigInt(1500))).toBe(1500);
    expect(summarizeJobCounts([
      { enabled: true, lastStatus: "SUCCESS", count: 4 },
      { enabled: true, lastStatus: "FAILED", count: 2 },
      { enabled: false, lastStatus: "TIMEOUT", count: 1 },
    ])).toEqual({ jobs: 7, armed: 6, failing: 3 });
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(parsePhones("+30690000000, nope, 123")).toEqual(["+30690000000"]);
    const token = newHookToken();
    expect(token.token.startsWith("hk_")).toBe(true);
    expect(hookUrl("https://cron.softify.gr", token.token)).toContain("/api/hooks/");
  });
});

describe("calendar", () => {
  it("buckets fires into 7 local days", () => {
    const days = buildWeekCalendar(
      [
        {
          id: "1",
          name: "Ping",
          cronExpr: "0 9 * * *",
          timezone: "UTC",
          lastStatus: "SUCCESS",
          nextRunAt: null,
          skipHolidays: false,
          skipWeekends: false,
          activeHoursStart: "",
          activeHoursEnd: "",
          snoozeUntil: null,
        },
      ],
      false,
      "UTC",
      new Date("2026-08-26T08:00:00.000Z"),
    );
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe(dayKey(new Date("2026-08-26T08:00:00.000Z"), "UTC"));
    expect(days.some((day) => day.events.length > 0)).toBe(true);
  });
});

describe("probes kinds", () => {
  it("recognizes TCP DNS TLS", () => {
    expect(isProbeType("TLS")).toBe(true);
    expect(isProbeType("HTTP")).toBe(false);
  });
});
