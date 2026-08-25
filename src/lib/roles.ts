import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { PERMISSIONS, rolePermissions, serializeGrants, type Permission } from "@/lib/acl";
import {
  RESERVED_ROLE_SLUGS,
  assertRoleMutation,
  isSystemRoleKey,
  rankFromRoleKey,
  storePermissions,
  type SystemRoleKey,
} from "@/lib/role-rules";
import type { Role } from "@prisma/client";

export { rankFromRoleKey, isSystemRoleKey };

const DEFAULTS: Array<{
  key: SystemRoleKey;
  name: string;
  description: string;
  locked: boolean;
  sortOrder: number;
  permissions: readonly Permission[];
}> = [
  {
    key: "OWNER",
    name: "Owner",
    description: "Full control of this workspace, including roles and billing-sensitive settings.",
    locked: true,
    sortOrder: 0,
    permissions: PERMISSIONS,
  },
  {
    key: "ADMIN",
    name: "Admin",
    description: "Manage jobs, people, secrets, and settings. Cannot change ownership.",
    locked: false,
    sortOrder: 1,
    permissions: rolePermissions("ADMIN"),
  },
  {
    key: "MEMBER",
    name: "Member",
    description: "View jobs, runs, and teammates. Extra permissions can be granted per person.",
    locked: false,
    sortOrder: 2,
    permissions: rolePermissions("MEMBER"),
  },
];

function uniqueKey(name: string, taken: Set<string>) {
  const base = slugify(name).slice(0, 32) || "role";
  if (RESERVED_ROLE_SLUGS.has(base)) {
    throw new Error("That name is reserved for a built-in role");
  }
  let key = base;
  for (let i = 2; i < 12; i += 1) {
    if (!taken.has(key) && !RESERVED_ROLE_SLUGS.has(key)) return key;
    key = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export async function ensureDefaultRoles(tenantId: string) {
  const existing = await prisma.tenantRole.findMany({ where: { tenantId } });
  const byKey = new Map(existing.map((role) => [role.key, role]));
  for (const def of DEFAULTS) {
    if (byKey.has(def.key)) continue;
    await prisma.tenantRole.create({
      data: {
        tenantId,
        key: def.key,
        name: def.name,
        description: def.description,
        permissions: serializeGrants([...def.permissions]),
        system: true,
        locked: def.locked,
        sortOrder: def.sortOrder,
      },
    });
  }

  const roles = await prisma.tenantRole.findMany({ where: { tenantId } });
  const idByKey = Object.fromEntries(roles.map((role) => [role.key, role.id]));
  for (const rank of ["OWNER", "ADMIN", "MEMBER"] as const) {
    const roleId = idByKey[rank];
    if (!roleId) continue;
    await prisma.membership.updateMany({
      where: { tenantId, role: rank, roleId: null },
      data: { roleId },
    });
    await prisma.invite.updateMany({
      where: { tenantId, role: rank, roleId: null },
      data: { roleId },
    });
  }
}

export async function listTenantRoles(tenantId: string) {
  await ensureDefaultRoles(tenantId);
  return prisma.tenantRole.findMany({
    where: { tenantId },
    include: {
      _count: { select: { memberships: true, invites: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getTenantRoleByKey(tenantId: string, key: string) {
  await ensureDefaultRoles(tenantId);
  return prisma.tenantRole.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
}

export async function resolveTenantRole(tenantId: string, key: string) {
  const role = await getTenantRoleByKey(tenantId, key);
  if (!role) throw new Error("Unknown role");
  return {
    ...role,
    rank: rankFromRoleKey(role.key) as Role,
  };
}

export async function createTenantRole(
  tenantId: string,
  input: { name: string; description?: string; permissions: string[] },
) {
  await ensureDefaultRoles(tenantId);
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Name is required");
  const existing = await prisma.tenantRole.findMany({
    where: { tenantId },
    select: { key: true },
  });
  const key = uniqueKey(name, new Set(existing.map((row) => row.key)));
  assertRoleMutation({ action: "create", system: false, locked: false, key });
  const maxSort = existing.length
    ? await prisma.tenantRole.aggregate({ where: { tenantId }, _max: { sortOrder: true } })
    : { _max: { sortOrder: 100 } };
  return prisma.tenantRole.create({
    data: {
      tenantId,
      key,
      name,
      description: (input.description ?? "").trim().slice(0, 240),
      permissions: storePermissions(input.permissions),
      system: false,
      locked: false,
      sortOrder: (maxSort._max.sortOrder ?? 100) + 1,
    },
    include: { _count: { select: { memberships: true, invites: true } } },
  });
}

export async function updateTenantRole(
  tenantId: string,
  id: string,
  input: { name?: string; description?: string; permissions?: string[] },
) {
  const role = await prisma.tenantRole.findFirst({ where: { id, tenantId } });
  if (!role) return null;
  assertRoleMutation({ action: "update", system: role.system, locked: role.locked, key: role.key });
  const name = input.name?.trim();
  return prisma.tenantRole.update({
    where: { id },
    data: {
      name: name && name.length >= 2 ? name : role.name,
      description:
        input.description !== undefined
          ? input.description.trim().slice(0, 240)
          : role.description,
      permissions:
        input.permissions !== undefined ? storePermissions(input.permissions) : role.permissions,
    },
    include: { _count: { select: { memberships: true, invites: true } } },
  });
}

export async function deleteTenantRole(tenantId: string, id: string, reassignKey?: string) {
  const role = await prisma.tenantRole.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { memberships: true, invites: true } } },
  });
  if (!role) return false;
  assertRoleMutation({
    action: "delete",
    system: role.system,
    locked: role.locked,
    key: role.key,
    memberCount: role._count.memberships,
    inviteCount: role._count.invites,
    reassignKey,
  });
  if (reassignKey) {
    const target = await resolveTenantRole(tenantId, reassignKey);
    await prisma.$transaction([
      prisma.membership.updateMany({
        where: { tenantId, roleId: role.id },
        data: { role: target.rank, roleId: target.id, grants: "" },
      }),
      prisma.invite.updateMany({
        where: { tenantId, roleId: role.id, acceptedAt: null },
        data: { role: target.rank, roleId: target.id },
      }),
      prisma.tenantRole.delete({ where: { id: role.id } }),
    ]);
    return true;
  }
  await prisma.tenantRole.delete({ where: { id: role.id } });
  return true;
}

export function canManageRoleCatalog(actor: { role: Role; platform?: boolean }) {
  return Boolean(actor.platform || actor.role === "OWNER");
}
