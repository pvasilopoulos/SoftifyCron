import { createHmac } from "node:crypto";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export function signAckToken(jobId: string, tenantId: string, ttlMs = 7 * 86_400_000) {
  const exp = Date.now() + ttlMs;
  const payload = `${jobId}.${tenantId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAckToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [jobId, tenantId, expRaw, sig] = parts;
  if (!jobId || !tenantId || !expRaw || !sig) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const payload = `${jobId}.${tenantId}.${expRaw}`;
  const expect = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (expect !== sig) return null;
  return { jobId, tenantId };
}
