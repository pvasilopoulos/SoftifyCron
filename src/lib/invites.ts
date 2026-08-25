import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/crypto";
import type { Role } from "@prisma/client";

const DAY = 1000 * 60 * 60 * 24;

export async function createInvite(
  tenantId: string,
  email: string,
  role: Role,
) {
  const normalized = email.trim().toLowerCase();
  const token = randomToken();
  const invite = await prisma.invite.create({
    data: {
      tenantId,
      email: normalized,
      role: role === "OWNER" ? "ADMIN" : role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * DAY),
    },
  });
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return { invite, url: `${base}/invite/${token}`, token };
}

export async function listInvites(tenantId: string) {
  return prisma.invite.findMany({
    where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { tenant: true },
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
      update: { role: invite.role },
      create: { userId, tenantId: invite.tenantId, role: invite.role },
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
