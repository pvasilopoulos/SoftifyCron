import { hashToken, randomToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export function newApiTokenValue() {
  const raw = `sc_${randomToken()}`;
  return {
    raw,
    tokenHash: hashToken(raw),
    prefix: raw.slice(0, 10),
  };
}

export async function resolveApiToken(header: string | null) {
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw.startsWith("sc_")) return null;
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
  if (!token) return null;
  await prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });
  return token;
}

export async function listApiTokens(tenantId: string) {
  return prisma.apiToken.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function createApiToken(tenantId: string, name: string) {
  const value = newApiTokenValue();
  const token = await prisma.apiToken.create({
    data: {
      tenantId,
      name: name.trim() || "API token",
      tokenHash: value.tokenHash,
      prefix: value.prefix,
    },
  });
  return { ...token, raw: value.raw };
}

export async function revokeApiToken(tenantId: string, tokenId: string) {
  const result = await prisma.apiToken.deleteMany({ where: { id: tokenId, tenantId } });
  return result.count > 0;
}
