import { describe, expect, it } from "vitest";
import { effectivePermissions, hasPermission, parseGrants } from "./acl";

describe("permissions", () => {
  it("gives owners every permission", () => {
    expect(hasPermission({ role: "OWNER" }, "people.manage")).toBe(true);
    expect(hasPermission({ role: "OWNER" }, "jobs.delete")).toBe(true);
  });

  it("lets members view but not edit until granted", () => {
    expect(hasPermission({ role: "MEMBER" }, "jobs.view")).toBe(true);
    expect(hasPermission({ role: "MEMBER" }, "jobs.edit")).toBe(false);
    expect(hasPermission({ role: "MEMBER", grants: "jobs.edit,jobs.run" }, "jobs.edit")).toBe(true);
    expect(hasPermission({ role: "MEMBER", grants: "jobs.edit,jobs.run" }, "jobs.run")).toBe(true);
  });

  it("treats platform admins as fully granted", () => {
    expect(hasPermission({ role: "MEMBER", platform: true }, "secrets.manage")).toBe(true);
  });

  it("parses grant lists", () => {
    expect(parseGrants("jobs.run, not-a-perm, jobs.edit")).toEqual(["jobs.run", "jobs.edit"]);
  });

  it("does not let admin extras shrink the admin baseline", () => {
    const perms = effectivePermissions("ADMIN", "");
    expect(perms).toContain("jobs.delete");
    expect(perms).toContain("people.manage");
  });

  it("lets a custom role template shrink admin-rank permissions", () => {
    expect(hasPermission({ role: "ADMIN", rolePerms: "jobs.view,runs.view" }, "people.manage")).toBe(
      false,
    );
    expect(hasPermission({ role: "ADMIN", rolePerms: "jobs.view,runs.view" }, "jobs.view")).toBe(true);
  });
});
