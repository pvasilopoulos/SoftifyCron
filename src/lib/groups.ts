import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { GROUP_COLORS } from "@/lib/acl";

export async function listGroups(tenantId: string) {
  return prisma.jobGroup.findMany({
    where: { tenantId },
    include: { _count: { select: { jobs: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createGroup(
  tenantId: string,
  input: { name: string; color?: string },
) {
  const base = slugify(input.name);
  let slug = base;
  for (let i = 0; i < 6; i += 1) {
    const exists = await prisma.jobGroup.findFirst({ where: { tenantId, slug } });
    if (!exists) break;
    slug = `${base}-${i + 2}`;
  }
  return prisma.jobGroup.create({
    data: {
      tenantId,
      name: input.name.trim(),
      slug,
      color: input.color && GROUP_COLORS.includes(input.color)
        ? input.color
        : GROUP_COLORS[0],
    },
  });
}

export async function updateGroup(
  tenantId: string,
  id: string,
  input: { name: string; color?: string },
) {
  const group = await prisma.jobGroup.findFirst({ where: { id, tenantId } });
  if (!group) return null;
  return prisma.jobGroup.update({
    where: { id },
    data: {
      name: input.name.trim(),
      color: input.color ?? group.color,
    },
  });
}

export async function deleteGroup(tenantId: string, id: string) {
  const result = await prisma.jobGroup.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}

export async function ensureDefaultGroups(tenantId: string) {
  const count = await prisma.jobGroup.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.jobGroup.createMany({
    data: [
      { tenantId, name: "Ops", slug: "ops", color: "#7dffce" },
      { tenantId, name: "Integrations", slug: "integrations", color: "#8b9cff" },
      { tenantId, name: "Billing", slug: "billing", color: "#ffc46b" },
    ],
  });
}
