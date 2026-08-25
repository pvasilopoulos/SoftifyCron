import { describe, expect, it } from "vitest";
import {
  assertRoleMutation,
  expandPermissions,
  isSystemRoleKey,
  rankFromRoleKey,
  storePermissions,
} from "./role-rules";

describe("role keys", () => {
  it("maps custom keys to the member rank", () => {
    expect(rankFromRoleKey("OWNER")).toBe("OWNER");
    expect(rankFromRoleKey("ADMIN")).toBe("ADMIN");
    expect(rankFromRoleKey("MEMBER")).toBe("MEMBER");
    expect(rankFromRoleKey("operator")).toBe("MEMBER");
  });

  it("recognizes built-in keys", () => {
    expect(isSystemRoleKey("OWNER")).toBe(true);
    expect(isSystemRoleKey("operator")).toBe(false);
  });
});

describe("permission expansion", () => {
  it("implies view access from edit and manage", () => {
    expect(expandPermissions(["jobs.edit", "people.manage"])).toEqual([
      "jobs.view",
      "jobs.edit",
      "runs.view",
      "people.view",
      "people.manage",
    ]);
  });

  it("stores a stable catalog order", () => {
    expect(storePermissions(["people.manage", "jobs.run"])).toBe(
      "jobs.view,jobs.run,runs.view,people.view,people.manage",
    );
  });
});

describe("assertRoleMutation", () => {
  it("blocks deleting built-in roles", () => {
    expect(() =>
      assertRoleMutation({ action: "delete", system: true, locked: false, key: "ADMIN" }),
    ).toThrow(/Built-in/);
  });

  it("requires reassignment when people still use the role", () => {
    expect(() =>
      assertRoleMutation({
        action: "delete",
        system: false,
        locked: false,
        key: "operator",
        memberCount: 2,
      }),
    ).toThrow(/Reassign/);
  });

  it("lets unused custom roles be deleted", () => {
    expect(() =>
      assertRoleMutation({
        action: "delete",
        system: false,
        locked: false,
        key: "operator",
        memberCount: 0,
        inviteCount: 0,
      }),
    ).not.toThrow();
  });

  it("locks the owner role from edits", () => {
    expect(() =>
      assertRoleMutation({ action: "update", system: true, locked: true, key: "OWNER" }),
    ).toThrow(/owner role/);
  });

  it("rejects reserved keys on create", () => {
    expect(() =>
      assertRoleMutation({ action: "create", system: false, locked: false, key: "ADMIN" }),
    ).toThrow(/reserved/);
  });
});
