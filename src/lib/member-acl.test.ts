import { describe, expect, it } from "vitest";
import {
  assertCanChangeRole,
  assertCanInvite,
  assertCanRemoveMember,
  memberCapabilities,
} from "./member-acl";
import { canInviteRole } from "./acl";

const owner = { role: "OWNER" as const, userId: "o1" };
const admin = { role: "ADMIN" as const, userId: "a1" };
const member = { role: "MEMBER" as const, userId: "m1" };

describe("canInviteRole", () => {
  it("lets owners invite admins and members", () => {
    expect(canInviteRole("OWNER", "ADMIN")).toBe(true);
    expect(canInviteRole("OWNER", "MEMBER")).toBe(true);
    expect(canInviteRole("OWNER", "OWNER")).toBe(false);
  });

  it("lets admins invite members only", () => {
    expect(canInviteRole("ADMIN", "MEMBER")).toBe(true);
    expect(canInviteRole("ADMIN", "ADMIN")).toBe(false);
  });

  it("lets members invite members at the role helper level", () => {
    expect(canInviteRole("MEMBER", "MEMBER")).toBe(true);
    expect(canInviteRole("MEMBER", "ADMIN")).toBe(false);
  });
});

describe("assertCanChangeRole", () => {
  it("blocks demoting the last owner", () => {
    expect(() =>
      assertCanChangeRole({
        actor: owner,
        targetUserId: "o1",
        targetRole: "OWNER",
        nextRole: "ADMIN",
        ownerCount: 1,
      }),
    ).toThrow(/at least one owner/);
  });

  it("lets an owner demote another owner when two exist", () => {
    expect(() =>
      assertCanChangeRole({
        actor: owner,
        targetUserId: "o2",
        targetRole: "OWNER",
        nextRole: "ADMIN",
        ownerCount: 2,
      }),
    ).not.toThrow();
  });

  it("blocks admins from changing roles", () => {
    expect(() =>
      assertCanChangeRole({
        actor: admin,
        targetUserId: "m1",
        targetRole: "MEMBER",
        nextRole: "ADMIN",
        ownerCount: 1,
      }),
    ).toThrow(/Admins cannot change roles/);
  });
});

describe("assertCanRemoveMember", () => {
  it("blocks removing the last owner", () => {
    expect(() =>
      assertCanRemoveMember({
        actor: owner,
        targetUserId: "o1",
        targetRole: "OWNER",
        ownerCount: 1,
      }),
    ).toThrow(/last owner/);
  });

  it("lets an admin remove a member but not an owner", () => {
    expect(() =>
      assertCanRemoveMember({
        actor: admin,
        targetUserId: "m1",
        targetRole: "MEMBER",
        ownerCount: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanRemoveMember({
        actor: admin,
        targetUserId: "o1",
        targetRole: "OWNER",
        ownerCount: 2,
      }),
    ).toThrow(/cannot remove/);
  });

  it("lets a member leave", () => {
    expect(() =>
      assertCanRemoveMember({
        actor: member,
        targetUserId: "m1",
        targetRole: "MEMBER",
        ownerCount: 1,
      }),
    ).not.toThrow();
  });

  it("lets a granted member remove another member but not an admin", () => {
    const granted = { ...member, grants: "people.manage" };
    expect(() =>
      assertCanRemoveMember({
        actor: granted,
        targetUserId: "m2",
        targetRole: "MEMBER",
        ownerCount: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanRemoveMember({
        actor: granted,
        targetUserId: "a1",
        targetRole: "ADMIN",
        ownerCount: 1,
      }),
    ).toThrow(/cannot remove/);
  });
});

describe("assertCanInvite", () => {
  it("rejects inviting an owner", () => {
    expect(() => assertCanInvite(owner, "OWNER")).toThrow(/Promote/);
  });

  it("blocks members without people.manage", () => {
    expect(() => assertCanInvite(member, "MEMBER")).toThrow(/cannot invite/);
  });

  it("lets a granted member invite other members", () => {
    expect(() =>
      assertCanInvite({ ...member, grants: "people.manage" }, "MEMBER"),
    ).not.toThrow();
    expect(() =>
      assertCanInvite({ ...member, grants: "people.manage" }, "ADMIN"),
    ).toThrow(/cannot invite that role/);
  });
});

describe("memberCapabilities", () => {
  it("locks the last owner's role", () => {
    const caps = memberCapabilities(owner, { userId: "o1", role: "OWNER" }, 1);
    expect(caps.canChangeRole).toBe(false);
    expect(caps.canRemove).toBe(false);
  });
});
