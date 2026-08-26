import { hashToken, randomToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_API_SCOPES,
  serializeApiScopes,
  type ApiScope,
} from "@/lib/api-scopes";

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
  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) return null;
  const stale =
    !token.lastUsedAt || Date.now() - token.lastUsedAt.getTime() > 60_000;
  if (stale) {
    await prisma.apiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });
  }
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
      scopes: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function createApiToken(
  tenantId: string,
  input: { name: string; scopes?: ApiScope[]; expiresInDays?: number | null },
) {
  const value = newApiTokenValue();
  const scopes = serializeApiScopes(input.scopes?.length ? input.scopes : DEFAULT_API_SCOPES);
  const days = input.expiresInDays && input.expiresInDays > 0 ? Math.min(3650, input.expiresInDays) : null;
  const token = await prisma.apiToken.create({
    data: {
      tenantId,
      name: input.name.trim() || "API token",
      tokenHash: value.tokenHash,
      prefix: value.prefix,
      scopes,
      expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
    },
  });
  return { ...token, raw: value.raw };
}

export async function revokeApiToken(tenantId: string, tokenId: string) {
  const result = await prisma.apiToken.deleteMany({ where: { id: tokenId, tenantId } });
  return result.count > 0;
}
