import { describe, expect, it } from "vitest";
import { inMaintWindow, maintAction, weekMinutes } from "./maintenance";
import { applyEventMutes, setEventMute } from "./event-mutes";
import { jsonLineDiff, prettyJsonText } from "./json-diff";
import { parseGridViews } from "./grid-views";

describe("maintenance windows", () => {
  it("covers Friday 22:00 to Monday 07:00", () => {
    const win = {
      enabled: true,
      startWd: 5,
      startHm: "22:00",
      endWd: 1,
      endHm: "07:00",
      muteOnly: false,
    };
    const fridayNight = new Date("2026-08-21T22:30:00Z"); // Friday 22:30 UTC
    const saturday = new Date("2026-08-22T12:00:00Z");
    const mondayMorning = new Date("2026-08-24T06:00:00Z");
    const mondayLate = new Date("2026-08-24T08:00:00Z");
    expect(inMaintWindow(fridayNight, "UTC", win)).toBe(true);
    expect(inMaintWindow(saturday, "UTC", win)).toBe(true);
    expect(inMaintWindow(mondayMorning, "UTC", win)).toBe(true);
    expect(inMaintWindow(mondayLate, "UTC", win)).toBe(false);
    expect(weekMinutes(fridayNight, "UTC")).toBeGreaterThan(5 * 1440);
  });

  it("mute-only does not skip", () => {
    const win = {
      enabled: true,
      startWd: 0,
      startHm: "00:00",
      endWd: 6,
      endHm: "23:59",
      muteOnly: true,
    };
    expect(maintAction(new Date("2026-08-25T12:00:00Z"), "UTC", win, null)).toEqual({
      skip: false,
      mute: true,
    });
  });
});

describe("event mutes", () => {
  it("drops muted events until expiry", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const mutes = setEventMute({}, "slow", 2, now);
    expect(applyEventMutes(["failure", "slow"], mutes, now)).toEqual(["failure"]);
    expect(
      applyEventMutes(["failure", "slow"], mutes, new Date("2026-08-25T15:00:00Z")),
    ).toEqual(["failure", "slow"]);
  });
});

describe("json line diff", () => {
  it("pretty-prints and marks changed lines", () => {
    expect(prettyJsonText('{"a":1}')).toBe('{\n  "a": 1\n}');
    const rows = jsonLineDiff('{"a":2,"b":1}', '{"a":1}');
    expect(rows.some((row) => row.kind !== "same")).toBe(true);
    expect(rows.find((row) => row.right.includes('"a": 2'))?.kind).toBe("chg");
  });
});

describe("saved grid views", () => {
  it("keeps named views and drops junk", () => {
    expect(parseGridViews([{ id: "v1", name: "Ops", freeze: true }])).toEqual([
      { id: "v1", name: "Ops", freeze: true },
    ]);
    expect(parseGridViews([{ name: "no-id" }, null, "x"])).toEqual([]);
  });
});
