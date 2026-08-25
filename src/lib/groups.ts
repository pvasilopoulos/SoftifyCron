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

const HEX = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function resolveColor(color?: string) {
  const value = color?.trim() ?? "";
  if (HEX.test(value)) {
    if (value.length === 4) {
      const r = value[1];
      const g = value[2];
      const b = value[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return value;
  }
  if (GROUP_COLORS.includes(value)) return value;
  return GROUP_COLORS[0];
}

export async function createGroup(
  tenantId: string,
  input: { name: string; color?: string },
) {
  const base = slugify(input.name) || "group";
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
      color: resolveColor(input.color),
    },
  });
}

export async function resolveGroupId(
  tenantId: string,
  input: { groupId?: string | null; groupName?: string | null },
) {
  const name = input.groupName?.trim();
  if (name) {
    const existing = await prisma.jobGroup.findFirst({
      where: { tenantId, name },
    });
    if (existing) return existing.id;
    const created = await createGroup(tenantId, { name });
    return created.id;
  }
  if (input.groupId) {
    const group = await prisma.jobGroup.findFirst({
      where: { id: input.groupId, tenantId },
    });
    if (!group) throw new Error("Group not found");
    return group.id;
  }
  return null;
}

export async function updateGroup(
  tenantId: string,
  id: string,
  input: {
    name: string;
    color?: string;
    maintEnabled?: boolean;
    maintStartWd?: number | string;
    maintStartHm?: string;
    maintEndWd?: number | string;
    maintEndHm?: string;
    maintMuteOnly?: boolean;
  },
) {
  const group = await prisma.jobGroup.findFirst({ where: { id, tenantId } });
  if (!group) return null;
  return prisma.jobGroup.update({
    where: { id },
    data: {
      name: input.name.trim(),
      color: input.color ? resolveColor(input.color) : group.color,
      maintEnabled: input.maintEnabled ?? group.maintEnabled,
      maintStartWd:
        input.maintStartWd == null
          ? group.maintStartWd
          : Math.min(6, Math.max(0, Math.trunc(Number(input.maintStartWd) || 5))),
      maintStartHm: input.maintStartHm?.trim() || group.maintStartHm,
      maintEndWd:
        input.maintEndWd == null
          ? group.maintEndWd
          : Math.min(6, Math.max(0, Math.trunc(Number(input.maintEndWd) || 1))),
      maintEndHm: input.maintEndHm?.trim() || group.maintEndHm,
      maintMuteOnly: input.maintMuteOnly ?? group.maintMuteOnly,
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
