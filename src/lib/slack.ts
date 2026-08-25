import { assertSafeUrl } from "./ssrf";

export async function sendSlack(webhookUrl: string, text: string) {
  const url = webhookUrl.trim();
  if (!url) throw new Error("Slack webhook URL is required");
  await assertSafeUrl(url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(body.trim() || `Slack HTTP ${response.status}`);
  }
  return { sent: true };
}
