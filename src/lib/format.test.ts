import { describe, expect, it } from "vitest";
import { formatRelative } from "./format";

describe("formatRelative", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("describes near-future and recent past", () => {
    expect(formatRelative(new Date(now.getTime() + 4 * 60_000), now)).toBe("in 4 min");
    expect(formatRelative(new Date(now.getTime() - 2 * 3600_000), now)).toBe("2h ago");
    expect(formatRelative(new Date(now.getTime() - 3_000), now)).toBe("just now");
  });

  it("returns em dash for empty values", () => {
    expect(formatRelative(null)).toBe("—");
    expect(formatRelative(undefined)).toBe("—");
  });
});
