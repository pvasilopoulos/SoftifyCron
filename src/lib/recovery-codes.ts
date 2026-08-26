import { createHash, randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "./crypto";

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

export function encodeRecoveryCodes(codes: string[]) {
  return encryptSecret(JSON.stringify(codes.map(hashRecoveryCode)));
}

export function remainingRecoveryHashes(enc: string | null | undefined): string[] {
  if (!enc) return [];
  try {
    const parsed = JSON.parse(decryptSecret(enc)) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function consumeRecoveryCode(enc: string | null | undefined, code: string) {
  const hashes = remainingRecoveryHashes(enc);
  const want = hashRecoveryCode(code);
  const index = hashes.indexOf(want);
  if (index === -1) return null;
  hashes.splice(index, 1);
  return hashes.length ? encryptSecret(JSON.stringify(hashes)) : "";
}
