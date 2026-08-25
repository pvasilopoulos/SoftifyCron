import { prisma } from "@/lib/prisma";
import { hashPassword, uniqueSlug } from "@/lib/auth";
import { ensureDefaultGroups } from "@/lib/groups";

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
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  timezone: string;
}) {
  const email = input.ownerEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists");
  const slug = await uniqueSlug(input.name);
  const passwordHash = await hashPassword(input.ownerPassword);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: input.ownerName.trim(), passwordHash },
    });
    const tenant = await tx.tenant.create({
      data: { name: input.name.trim(), slug, timezone: input.timezone },
    });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
    });
    return { user, tenant };
  });
  await ensureDefaultGroups(created.tenant.id);
  return created;
}

export async function getCustomer(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { jobs: true, memberships: true, runs: true } },
      memberships: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
