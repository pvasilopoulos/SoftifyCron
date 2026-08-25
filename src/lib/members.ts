import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  assertCanChangeRole,
  assertCanInvite,
  assertCanRemoveMember,
  memberCapabilities,
  type MemberActor,
} from "@/lib/member-acl";
import {
  effectivePermissions,
  hasPermission,
  serializeGrants,
  type Permission,
} from "@/lib/acl";
import type { Role } from "@prisma/client";

function actorFrom(session: {
  sub: string;
  role: Role;
  platform?: boolean;
  grants?: string;
}): MemberActor {
  return {
    userId: session.sub,
    role: session.role,
    platform: session.platform,
    grants: session.grants,
  };
}

export async function listMembers(tenantId: string) {
  return prisma.membership.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

async function ownerCount(tenantId: string) {
  return prisma.membership.count({ where: { tenantId, role: "OWNER" } });
}

export async function membersForClient(
  tenantId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string },
) {
  const [rows, owners] = await Promise.all([listMembers(tenantId), ownerCount(tenantId)]);
  const actor = actorFrom(session);
  const rank: Record<Role, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  return rows
    .map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      grants: row.grants,
      createdAt: row.createdAt,
      name: row.user.name,
      email: row.user.email,
      permissions: effectivePermissions(row.role, row.grants),
      ...memberCapabilities(actor, { userId: row.userId, role: row.role }, owners),
    }))
    .sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name, "en"));
}

export async function addExistingOrCreateMember(
  tenantId: string,
  session: { sub: string; role: Role; platform?: boolean },
  input: { email: string; name?: string; password?: string; role: Role },
) {
  assertCanInvite(actorFrom(session), input.role);
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { tenantId } } },
  });
  if (existing?.platformRole === "SUPERADMIN") {
    throw new Error("Platform admins enter workspaces from the customer list");
  }
  if (existing?.memberships.length) {
    throw new Error("That person is already in this workspace");
  }

  if (existing) {
    const membership = await prisma.membership.create({
      data: { userId: existing.id, tenantId, role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return { membership, createdUser: false };
  }

  const name = input.name?.trim();
  const password = input.password ?? "";
  if (!name || name.length < 2) throw new Error("Name is required for a new login");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      memberships: { create: { tenantId, role: input.role } },
    },
    include: {
      memberships: {
        where: { tenantId },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  const membership = user.memberships[0];
  if (!membership) throw new Error("Could not add teammate");
  return { membership, createdUser: true };
}

export async function changeMemberRole(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string },
  nextRole: Role,
) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return null;
  const owners = await ownerCount(tenantId);
  assertCanChangeRole({
    actor: actorFrom(session),
    targetUserId: membership.userId,
    targetRole: membership.role,
    nextRole,
    ownerCount: owners,
  });
  return prisma.membership.update({
    where: { id: membership.id },
    data: { role: nextRole, grants: nextRole === "MEMBER" ? membership.grants : "" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function changeMemberGrants(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string },
  grants: Permission[],
) {
  if (!hasPermission(session, "people.manage") && !session.platform) {
    throw new Error("You cannot change permissions");
  }
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return null;
  if (membership.role !== "MEMBER") {
    throw new Error("Extra permissions apply to members. Change the role instead.");
  }
  return prisma.membership.update({
    where: { id: membership.id },
    data: { grants: serializeGrants(grants) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function removeMember(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean },
) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return false;
  const owners = await ownerCount(tenantId);
  assertCanRemoveMember({
    actor: actorFrom(session),
    targetUserId: membership.userId,
    targetRole: membership.role,
    ownerCount: owners,
  });
  await prisma.membership.delete({ where: { id: membership.id } });
  return true;
}

export async function listMyWorkspaces(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
}
