import { assertSafeUrl } from "./ssrf";

export function parsePhones(raw: string | null | undefined) {
  const parts = String(raw ?? "")
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const phone = part.replace(/[^\d+]/g, "");
    if (phone.length < 8 || phone.length > 20) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    out.push(phone);
    if (out.length >= 8) break;
  }
  return out;
}

export async function sendSms(input: {
  url: string;
  user?: string | null;
  pass?: string | null;
  from?: string | null;
  to: string[];
  text: string;
}) {
  if (!input.to.length) throw new Error("SMS recipients are required");
  await assertSafeUrl(input.url);
  const response = await fetch(input.url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "SoftifyCron/1.0" },
    body: JSON.stringify({
      from: input.from || "SoftifyCron",
      to: input.to,
      text: input.text.slice(0, 480),
      user: input.user || undefined,
      pass: input.pass || undefined,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.text().catch(() => "");
  if (!response.ok) throw new Error(body.trim() || `SMS HTTP ${response.status}`);
  return { sent: true };
}
