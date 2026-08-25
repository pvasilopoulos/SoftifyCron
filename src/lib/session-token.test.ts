import { describe, expect, it } from "vitest";
import { homePath } from "./session-token";

describe("homePath", () => {
  it("sends guests to login", () => {
    expect(homePath(null)).toBe("/login");
  });

  it("sends platform admins without a tenant to admin", () => {
    expect(homePath({ platform: true, tid: "" })).toBe("/admin");
  });

  it("sends tenant users to the dashboard", () => {
    expect(homePath({ platform: false, tid: "t_1" })).toBe("/dashboard");
  });

  it("keeps a platform admin inside a tenant on the dashboard", () => {
    expect(homePath({ platform: true, tid: "t_1" })).toBe("/dashboard");
  });
});
