import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export function signPortalMagic(clientId: string, email: string, ttlMs = 24 * 86_400_000) {
  const body = Buffer.from(
    JSON.stringify({
      c: clientId,
      e: email.trim().toLowerCase(),
      exp: Date.now() + ttlMs,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(`portal.${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPortalMagic(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expect = createHmac("sha256", secret()).update(`portal.${body}`).digest("base64url");
  const left = Buffer.from(expect);
  const right = Buffer.from(sig);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      c?: unknown;
      e?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.c !== "string" || typeof parsed.e !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (!Number.isFinite(parsed.exp) || parsed.exp < Date.now()) return null;
    const email = parsed.e.trim().toLowerCase();
    if (!email.includes("@")) return null;
    return { clientId: parsed.c, email };
  } catch {
    return null;
  }
}
