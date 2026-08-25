import { describe, expect, it } from "vitest";
import { assertOwnerProvision } from "./admin-rules";

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
