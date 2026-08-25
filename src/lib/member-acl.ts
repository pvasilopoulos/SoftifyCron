import type { Role } from "@prisma/client";
import { canInviteRole, hasPermission } from "@/lib/acl";

export type MemberActor = {
  role: Role;
  userId: string;
  platform?: boolean;
  grants?: string;
};

function effectiveRole(actor: MemberActor): Role {
  return actor.platform ? "OWNER" : actor.role;
}

export function assertCanInvite(actor: MemberActor, role: Role) {
  if (!hasPermission(actor, "people.manage") && !actor.platform) {
    throw new Error("You cannot invite teammates");
  }
  if (!canInviteRole(effectiveRole(actor), role)) {
    throw new Error(
      role === "OWNER"
        ? "Promote an existing teammate to owner instead of inviting one"
        : "You cannot invite that role",
    );
  }
}

export function assertCanChangeRole(input: {
  actor: MemberActor;
  targetUserId: string;
  targetRole: Role;
  nextRole: Role;
  ownerCount: number;
}) {
  const actorRole = effectiveRole(input.actor);
  if (input.targetRole === input.nextRole) return;
  if (!hasPermission(input.actor, "people.manage") && !input.actor.platform) {
    throw new Error("Members cannot change roles");
  }
  if (actorRole !== "OWNER") {
    throw new Error("Admins cannot change roles — ask an owner");
  }
  if (input.targetRole === "OWNER" && input.nextRole !== "OWNER" && input.ownerCount <= 1) {
    throw new Error("Keep at least one owner in this workspace");
  }
}

export function assertCanRemoveMember(input: {
  actor: MemberActor;
  targetUserId: string;
  targetRole: Role;
  ownerCount: number;
}) {
  const actorRole = effectiveRole(input.actor);
  const self = input.actor.userId === input.targetUserId && !input.actor.platform;
  if (input.targetRole === "OWNER" && input.ownerCount <= 1) {
    throw new Error("Transfer ownership before removing the last owner");
  }
  if (self) return;
  if (actorRole === "OWNER") return;
  if (hasPermission(input.actor, "people.manage") && input.targetRole === "MEMBER") return;
  throw new Error("You cannot remove this person");
}

export function memberCapabilities(
  actor: MemberActor,
  member: { userId: string; role: Role },
  ownerCount: number,
) {
  const actorRole = effectiveRole(actor);
  const self = actor.userId === member.userId && !actor.platform;
  const canChangeRole =
    actorRole === "OWNER" && !(member.role === "OWNER" && ownerCount <= 1);
  let canRemove = false;
  try {
    assertCanRemoveMember({
      actor,
      targetUserId: member.userId,
      targetRole: member.role,
      ownerCount,
    });
    canRemove = true;
  } catch {
    canRemove = false;
  }
  const canChangeGrants =
    member.role === "MEMBER" && hasPermission(actor, "people.manage");
  return { canChangeRole, canChangeGrants, canRemove, self };
}
