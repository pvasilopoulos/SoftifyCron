import { prisma } from "@/lib/prisma";
import { hashPassword, uniqueSlug } from "@/lib/auth";
import { ensureDefaultGroups } from "@/lib/groups";
import { ensureDefaultRoles } from "@/lib/roles";
import { changeMemberRole, provisionTenantPerson } from "@/lib/members";
import { assertCanDeletePlatformUser, assertOwnerProvision } from "./admin-rules";

export { assertOwnerProvision };

export async function listTenantOptions() {
  return prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function listCustomers() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true, memberships: true, runs: true } },
      memberships: {
        where: { role: "OWNER" },
        take: 3,
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });
  const failing = await prisma.cronJob.groupBy({
    by: ["tenantId"],
    where: { lastStatus: { in: ["FAILED", "TIMEOUT", "BLOCKED"] } },
    _count: { _all: true },
  });
  const failMap = new Map(failing.map((row) => [row.tenantId, row._count._all]));
  return tenants.map((tenant) => ({
    ...tenant,
    failing: failMap.get(tenant.id) ?? 0,
  }));
}

export async function createCustomer(input: {
  name: string;
  ownerMode: "create" | "attach";
  ownerName?: string;
  ownerEmail: string;
  ownerPassword?: string;
  timezone: string;
}) {
  const email = input.ownerEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  assertOwnerProvision({ mode: input.ownerMode, existing });
  const slug = await uniqueSlug(input.name);

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.name.trim(), slug, timezone: input.timezone },
    });
    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const user = await tx.user.create({
        data: {
          email,
          name: (input.ownerName ?? "").trim(),
          passwordHash: await hashPassword(input.ownerPassword ?? ""),
        },
      });
      userId = user.id;
    }
    await tx.membership.create({
      data: { userId, tenantId: tenant.id, role: "OWNER" },
    });
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return { user, tenant };
  });
  await ensureDefaultGroups(created.tenant.id);
  await ensureDefaultRoles(created.tenant.id);
  return created;
}

export async function updateCustomer(
  tenantId: string,
  input: { name: string; timezone: string },
) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { name: input.name.trim(), timezone: input.timezone },
  });
}

export async function deleteCustomer(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return false;
  await prisma.tenant.delete({ where: { id: tenantId } });
  return true;
}

export async function getCustomer(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { jobs: true, memberships: true, runs: true } },
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const userMembershipInclude = {
  tenant: { select: { id: true, name: true, slug: true } },
  roleRef: { select: { key: true, name: true } },
} as const;

export async function listPlatformUsers(q?: string) {
  const needle = q?.trim();
  return prisma.user.findMany({
    where: {
      platformRole: "USER",
      ...(needle
        ? {
            OR: [
              { email: { contains: needle } },
              { name: { contains: needle } },
            ],
          }
        : {}),
    },
    include: {
      memberships: {
        include: userMembershipInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlatformUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, platformRole: "USER" },
    include: {
      memberships: {
        include: userMembershipInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listRoleOptions() {
  return prisma.tenantRole.findMany({
    select: { tenantId: true, key: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createPlatformUser(input: {
  email: string;
  name?: string;
  password?: string;
  tenantId: string;
  role: string;
}) {
  return provisionTenantPerson(input.tenantId, {
    email: input.email,
    name: input.name,
    password: input.password,
    roleKey: input.role,
  });
}

export async function updatePlatformUser(
  userId: string,
  input: { name: string; email: string; password?: string },
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, platformRole: "USER" },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");
  const email = input.email.trim().toLowerCase();
  const taken = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) throw new Error("That email is already in use");
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      email,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    },
  });
}

export async function setPlatformUserRole(
  userId: string,
  input: { membershipId?: string; tenantId?: string; role: string },
) {
  const user = await getPlatformUser(userId);
  if (!user) throw new Error("User not found");
  const actor = {
    sub: userId,
    role: "OWNER" as const,
    platform: true,
    grants: "",
    rolePerms: "",
  };

  if (input.membershipId) {
    const membership = user.memberships.find((row) => row.id === input.membershipId);
    if (!membership) throw new Error("Membership not found");
    const updated = await changeMemberRole(
      membership.tenantId,
      membership.id,
      actor,
      input.role,
    );
    if (!updated) throw new Error("Could not change role");
    return updated;
  }

  if (!input.tenantId) throw new Error("Select a tenant");
  if (user.memberships.some((row) => row.tenantId === input.tenantId)) {
    throw new Error("That person is already in this workspace");
  }
  return provisionTenantPerson(input.tenantId, {
    email: user.email,
    roleKey: input.role,
  });
}

export async function deletePlatformUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    include: {
      memberships: { include: { tenant: { select: { id: true, name: true } } } },
    },
  });
  if (!user || user.platformRole !== "USER") throw new Error("User not found");

  const ownerTenantIds = [
    ...new Set(
      user.memberships.filter((row) => row.role === "OWNER").map((row) => row.tenantId),
    ),
  ];
  const counts = ownerTenantIds.length
    ? await prisma.membership.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: ownerTenantIds }, role: "OWNER" },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(counts.map((row) => [row.tenantId, row._count._all]));

  assertCanDeletePlatformUser({
    platformRole: user.platformRole,
    memberships: user.memberships.map((row) => ({
      role: row.role,
      tenantName: row.tenant.name,
      ownerCount: countMap.get(row.tenantId) ?? 0,
    })),
  });

  await prisma.user.delete({ where: { id: userId } });
  return true;
}
