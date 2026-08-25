import { describe, expect, it } from "vitest";
import { assertCanDeletePlatformUser, assertOwnerProvision } from "./admin-rules";

describe("assertOwnerProvision", () => {
  it("rejects platform admins as tenant owners", () => {
    expect(() =>
      assertOwnerProvision({ mode: "attach", existing: { platformRole: "SUPERADMIN" } }),
    ).toThrow(/cannot own/);
  });

  it("requires an existing account when attaching", () => {
    expect(() => assertOwnerProvision({ mode: "attach", existing: null })).toThrow(/No account/);
  });

  it("requires a new email when creating a login", () => {
    expect(() =>
      assertOwnerProvision({ mode: "create", existing: { platformRole: "USER" } }),
    ).toThrow(/already exists/);
  });

  it("allows creating against an empty email and attaching a user", () => {
    expect(() => assertOwnerProvision({ mode: "create", existing: null })).not.toThrow();
    expect(() =>
      assertOwnerProvision({ mode: "attach", existing: { platformRole: "USER" } }),
    ).not.toThrow();
  });
});

describe("assertCanDeletePlatformUser", () => {
  it("blocks deleting a platform admin", () => {
    expect(() =>
      assertCanDeletePlatformUser({ platformRole: "SUPERADMIN", memberships: [] }),
    ).toThrow(/cannot be deleted/);
  });

  it("blocks deleting the last owner of a tenant", () => {
    expect(() =>
      assertCanDeletePlatformUser({
        platformRole: "USER",
        memberships: [{ role: "OWNER", tenantName: "Aurora", ownerCount: 1 }],
      }),
    ).toThrow(/Aurora/);
  });

  it("lets a member or extra owner be deleted", () => {
    expect(() =>
      assertCanDeletePlatformUser({
        platformRole: "USER",
        memberships: [
          { role: "MEMBER", tenantName: "Aurora", ownerCount: 1 },
          { role: "OWNER", tenantName: "Helios", ownerCount: 2 },
        ],
      }),
    ).not.toThrow();
  });

  it("lets a user with no tenant be deleted", () => {
    expect(() =>
      assertCanDeletePlatformUser({ platformRole: "USER", memberships: [] }),
    ).not.toThrow();
  });
});
