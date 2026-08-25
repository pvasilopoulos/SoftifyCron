import { timingSafeEqual } from "node:crypto";

export function cronSecretConfigured() {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function cronSecretFromRequest(request: Request) {
  const header = request.headers.get("x-cron-secret");
  if (header?.trim()) return header.trim();
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const query = new URL(request.url).searchParams.get("secret");
  return query?.trim() || null;
}

function sameSecret(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyCronSecret(provided: string | null) {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  if (!expected || !provided) return false;
  return sameSecret(provided, expected);
}
