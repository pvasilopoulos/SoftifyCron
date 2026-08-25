import { prisma } from "@/lib/prisma";

export async function writeAudit(input: {
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  target?: string | null;
  meta?: unknown;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        target: input.target ?? null,
        meta: input.meta == null ? null : JSON.stringify(input.meta),
      },
    });
  } catch (error) {
    console.error("[audit] failed", error);
  }
}

export async function listAuditEvents(input: { tenantId?: string; take?: number }) {
  return prisma.auditEvent.findMany({
    where: input.tenantId ? { tenantId: input.tenantId } : {},
    include: {
      actor: { select: { email: true, name: true } },
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 100,
  });
}
