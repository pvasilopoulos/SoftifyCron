import { describe, expect, it } from "vitest";
import {
  fillFooterNav,
  groupedNav,
  isNavActive,
  isRailGroupExpanded,
  navForSession,
  parseFooterNav,
  parseRailGroups,
} from "./nav";

describe("navForSession", () => {
  it("hides platform links for customers", () => {
    expect(navForSession(false).some((item) => item.id === "tenants")).toBe(false);
    expect(navForSession(true).some((item) => item.id === "tenants")).toBe(true);
  });
});

describe("groupedNav", () => {
  it("keeps groups that have items", () => {
    const groups = groupedNav(navForSession(false));
    expect(groups.map((group) => group.id)).toEqual(["workspace", "team", "account"]);
  });
});

describe("parseFooterNav", () => {
  const allowed = ["home", "jobs", "runs", "people"] as const;

  it("falls back to home jobs runs", () => {
    expect(parseFooterNav(null, [...allowed])).toEqual(["home", "jobs", "runs"]);
  });

  it("keeps a custom three-item pin list", () => {
    expect(parseFooterNav(JSON.stringify(["people", "runs", "jobs"]), [...allowed])).toEqual([
      "people",
      "runs",
      "jobs",
    ]);
  });

  it("drops unknown ids and fills the rest", () => {
    expect(parseFooterNav(JSON.stringify(["nope", "people"]), [...allowed])).toEqual([
      "people",
      "home",
      "jobs",
    ]);
  });
});

describe("fillFooterNav", () => {
  it("never exceeds three pins", () => {
    expect(fillFooterNav(["home", "jobs", "runs", "people"], ["home", "jobs", "runs", "people"])).toHaveLength(
      3,
    );
  });
});

describe("parseRailGroups", () => {
  it("defaults to empty (all expanded)", () => {
    expect(parseRailGroups(null)).toEqual({});
    expect(isRailGroupExpanded("team", {})).toBe(true);
  });

  it("reads explicit true/false flags", () => {
    const stored = parseRailGroups(JSON.stringify({ team: false, workspace: true }));
    expect(isRailGroupExpanded("team", stored)).toBe(false);
    expect(isRailGroupExpanded("workspace", stored)).toBe(true);
    expect(isRailGroupExpanded("account", stored)).toBe(true);
  });

  it("ignores invalid payloads", () => {
    expect(parseRailGroups("nope")).toEqual({});
    expect(parseRailGroups(JSON.stringify(["team"]))).toEqual({});
    expect(parseRailGroups(JSON.stringify({ team: "no" }))).toEqual({});
  });
});

describe("isNavActive", () => {
  it("matches settings hashes", () => {
    expect(isNavActive("/settings", "#roles", { id: "roles", href: "/settings#roles", label: "Roles", group: "team" })).toBe(
      true,
    );
    expect(isNavActive("/settings", "#appearance", { id: "settings", href: "/settings#workspace", label: "Settings", group: "account" })).toBe(
      true,
    );
  });

  it("matches job nested routes", () => {
    expect(isNavActive("/jobs/abc", "", { id: "jobs", href: "/jobs", label: "Jobs", group: "workspace" })).toBe(
      true,
    );
  });
});
