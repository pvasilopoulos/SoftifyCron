import { prisma } from "@/lib/prisma";
import { hashPassword, uniqueSlug } from "@/lib/auth";
import { ensureDefaultGroups } from "@/lib/groups";
import { ensureDefaultRoles } from "@/lib/roles";
import { provisionTenantPerson } from "@/lib/members";
import { assertOwnerProvision } from "./admin-rules";

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
        include: { tenant: { select: { id: true, name: true, slug: true } } },
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
        include: { tenant: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
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
