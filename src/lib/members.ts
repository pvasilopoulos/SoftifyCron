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
import { resolveTenantRole } from "@/lib/roles";
import type { Role } from "@prisma/client";

function actorFrom(session: {
  sub: string;
  role: Role;
  platform?: boolean;
  grants?: string;
  rolePerms?: string;
}): MemberActor {
  return {
    userId: session.sub,
    role: session.role,
    platform: session.platform,
    grants: session.grants,
    rolePerms: session.rolePerms,
  };
}

export async function listMembers(tenantId: string) {
  return prisma.membership.findMany({
    where: { tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      roleRef: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

async function ownerCount(tenantId: string) {
  return prisma.membership.count({ where: { tenantId, role: "OWNER" } });
}

export async function membersForClient(
  tenantId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string; rolePerms?: string },
) {
  const [rows, owners] = await Promise.all([listMembers(tenantId), ownerCount(tenantId)]);
  const actor = actorFrom(session);
  const rank: Record<Role, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  return rows
    .map((row) => {
      const roleKey = row.roleRef?.key ?? row.role;
      const caps = memberCapabilities(
        actor,
        { userId: row.userId, role: row.role, roleKey },
        owners,
      );
      return {
        id: row.id,
        userId: row.userId,
        role: row.role,
        roleKey,
        roleName: row.roleRef?.name ?? row.role,
        roleId: row.roleId,
        grants: row.grants,
        createdAt: row.createdAt,
        name: row.user.name,
        email: row.user.email,
        permissions: effectivePermissions(
          row.role,
          row.grants,
          false,
          row.roleRef?.permissions,
        ),
        ...caps,
      };
    })
    .sort(
      (a, b) =>
        rank[a.role] - rank[b.role] ||
        a.roleName.localeCompare(b.roleName, "en") ||
        a.name.localeCompare(b.name, "en"),
    );
}

export async function provisionTenantPerson(
  tenantId: string,
  input: { email: string; name?: string; password?: string; role?: Role; roleKey?: string },
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new Error("Tenant not found");
  const resolved = await resolveTenantRole(tenantId, input.roleKey ?? input.role ?? "MEMBER");
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
      data: {
        userId: existing.id,
        tenantId,
        role: resolved.rank,
        roleId: resolved.id,
      },
      include: { user: { select: { id: true, name: true, email: true } }, roleRef: true },
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
      memberships: {
        create: { tenantId, role: resolved.rank, roleId: resolved.id },
      },
    },
    include: {
      memberships: {
        where: { tenantId },
        include: { user: { select: { id: true, name: true, email: true } }, roleRef: true },
      },
    },
  });
  const membership = user.memberships[0];
  if (!membership) throw new Error("Could not add teammate");
  return { membership, createdUser: true };
}

export async function addExistingOrCreateMember(
  tenantId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string; rolePerms?: string },
  input: { email: string; name?: string; password?: string; role?: Role; roleKey?: string },
) {
  const resolved = await resolveTenantRole(tenantId, input.roleKey ?? input.role ?? "MEMBER");
  assertCanInvite(actorFrom(session), resolved.rank);
  return provisionTenantPerson(tenantId, { ...input, roleKey: resolved.key });
}

export async function changeMemberRole(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string; rolePerms?: string },
  nextKey: string,
) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return null;
  const resolved = await resolveTenantRole(tenantId, nextKey);
  const owners = await ownerCount(tenantId);
  assertCanChangeRole({
    actor: actorFrom(session),
    targetUserId: membership.userId,
    targetRole: membership.role,
    nextRole: resolved.rank,
    ownerCount: owners,
  });
  return prisma.membership.update({
    where: { id: membership.id },
    data: {
      role: resolved.rank,
      roleId: resolved.id,
      grants: resolved.key === "MEMBER" ? membership.grants : "",
    },
    include: { user: { select: { id: true, name: true, email: true } }, roleRef: true },
  });
}

export async function changeMemberGrants(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string; rolePerms?: string },
  grants: Permission[],
) {
  if (!hasPermission(session, "people.manage") && !session.platform) {
    throw new Error("You cannot change permissions");
  }
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
    include: { roleRef: true },
  });
  if (!membership) return null;
  const key = membership.roleRef?.key ?? membership.role;
  if (key !== "MEMBER") {
    throw new Error("Extra permissions apply to members. Change the role instead.");
  }
  return prisma.membership.update({
    where: { id: membership.id },
    data: { grants: serializeGrants(grants) },
    include: { user: { select: { id: true, name: true, email: true } }, roleRef: true },
  });
}

export async function removeMember(
  tenantId: string,
  membershipId: string,
  session: { sub: string; role: Role; platform?: boolean; grants?: string; rolePerms?: string },
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

export async function getWorkspaceForUser(userId: string, tenantId: string) {
  return prisma.membership.findFirst({
    where: { userId, tenantId },
    include: { tenant: true },
  });
}
