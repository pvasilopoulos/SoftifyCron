const TELEGRAM_API = "https://api.telegram.org";

export function looksLikeTelegramToken(token: string) {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token.trim());
}

export async function sendTelegram(token: string, chatId: string, text: string) {
  const trimmedToken = token.trim();
  const trimmedChat = chatId.trim();
  if (!looksLikeTelegramToken(trimmedToken)) {
    throw new Error("Telegram bot token looks invalid");
  }
  if (!trimmedChat) {
    throw new Error("Telegram chat id is required");
  }

  const response = await fetch(`${TELEGRAM_API}/bot${trimmedToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: trimmedChat,
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? `Telegram HTTP ${response.status}`);
  }
  return { sent: true };
}
