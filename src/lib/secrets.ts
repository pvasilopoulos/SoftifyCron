import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { interpolateSecrets } from "@/lib/interpolate";

const KEY_RE = /^[A-Z][A-Z0-9_]{1,63}$/;

export async function listSecrets(tenantId: string) {
  const rows = await prisma.secret.findMany({
    where: { tenantId },
    orderBy: { key: "asc" },
    select: { id: true, name: true, key: true, createdAt: true, updatedAt: true },
  });
  return rows;
}

export async function createSecret(
  tenantId: string,
  input: { name: string; key: string; value: string },
) {
  const key = input.key.trim().toUpperCase();
  if (!KEY_RE.test(key)) {
    throw new Error("Key must look like STRIPE_TOKEN");
  }
  return prisma.secret.create({
    data: {
      tenantId,
      name: input.name.trim(),
      key,
      valueEnc: encryptSecret(input.value),
    },
  });
}

export async function deleteSecret(tenantId: string, id: string) {
  const result = await prisma.secret.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}

export async function resolveSecrets(
  tenantId: string,
  text: string | null | undefined,
) {
  if (!text) return text ?? "";
  const keys = [...text.matchAll(/\{\{SECRET:([A-Z][A-Z0-9_]*)\}\}/g)].map(
    (match) => match[1]!,
  );
  if (keys.length === 0) return text;
  const rows = await prisma.secret.findMany({
    where: { tenantId, key: { in: keys } },
  });
  const map = new Map(rows.map((row) => [row.key, decryptSecret(row.valueEnc)]));
  return interpolateSecrets(text, (key) => map.get(key));
}
