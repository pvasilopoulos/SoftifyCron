import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/crypto";
import { resolveTenantRole } from "@/lib/roles";

const DAY = 1000 * 60 * 60 * 24;

export async function createInvite(tenantId: string, email: string, roleKey: string) {
  const normalized = email.trim().toLowerCase();
  const already = await prisma.membership.findFirst({
    where: { tenantId, user: { email: normalized } },
  });
  if (already) throw new Error("That person is already in this workspace");
  const resolved = await resolveTenantRole(tenantId, roleKey);
  await prisma.invite.deleteMany({
    where: { tenantId, email: normalized, acceptedAt: null },
  });
  const token = randomToken();
  const invite = await prisma.invite.create({
    data: {
      tenantId,
      email: normalized,
      role: resolved.rank,
      roleId: resolved.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * DAY),
    },
    include: { roleRef: true },
  });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return { invite, url: `${base}/invite/${token}`, token };
}

export async function listInvites(tenantId: string) {
  return prisma.invite.findMany({
    where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { roleRef: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { tenant: true, roleRef: true },
  });
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  return invite;
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("Invite is invalid or expired");
  if (invite.email !== userEmail.trim().toLowerCase()) {
    throw new Error("This invite was issued to a different email");
  }
  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { userId_tenantId: { userId, tenantId: invite.tenantId } },
      update: { role: invite.role, roleId: invite.roleId },
      create: {
        userId,
        tenantId: invite.tenantId,
        role: invite.role,
        roleId: invite.roleId,
      },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });
  return invite;
}

export async function revokeInvite(tenantId: string, id: string) {
  const result = await prisma.invite.deleteMany({
    where: { id, tenantId, acceptedAt: null },
  });
  return result.count > 0;
}
