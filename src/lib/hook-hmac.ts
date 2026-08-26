import { createHmac, timingSafeEqual } from "node:crypto";

export type HookHmacMode = "" | "github" | "gitlab";

export function parseHookHmac(raw: string | null | undefined): HookHmacMode {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "github" || value === "gitlab") return value;
  return "";
}

export function verifyGithubSignature(secret: string, rawBody: string, header: string | null) {
  const want = header?.trim() ?? "";
  if (!want.toLowerCase().startsWith("sha256=")) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = want.slice(7);
  const a = Buffer.from(digest);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyGitlabToken(secret: string, header: string | null) {
  const given = header?.trim() ?? "";
  if (!given || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}
