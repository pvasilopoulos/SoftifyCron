const TELEGRAM_API = "https://api.telegram.org";

export function looksLikeTelegramToken(token: string) {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token.trim());
}

type TelegramApi = { ok?: boolean; description?: string; result?: unknown };

async function telegramCall(token: string, method: string, body?: Record<string, unknown>) {
  const trimmed = token.trim();
  if (!looksLikeTelegramToken(trimmed)) {
    throw new Error("Telegram bot token looks invalid");
  }
  const response = await fetch(`${TELEGRAM_API}/bot${trimmed}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json().catch(() => null)) as TelegramApi | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? `Telegram HTTP ${response.status}`);
  }
  return data.result;
}

export async function sendTelegram(token: string, chatId: string, text: string) {
  const trimmedChat = chatId.trim();
  if (!trimmedChat) throw new Error("Telegram chat id is required");
  await telegramCall(token, "sendMessage", {
    chat_id: trimmedChat,
    text,
    disable_web_page_preview: true,
  });
  return { sent: true };
}

export type TelegramBotInfo = { id: number; username: string; name: string };

export async function telegramGetMe(token: string): Promise<TelegramBotInfo> {
  const result = (await telegramCall(token, "getMe")) as {
    id?: number;
    username?: string;
    first_name?: string;
  } | null;
  return {
    id: result?.id ?? 0,
    username: result?.username ?? "",
    name: result?.first_name ?? "",
  };
}

export type TelegramChatHint = { id: string; label: string };

export function chatsFromTelegramUpdates(updates: unknown[]): TelegramChatHint[] {
  const map = new Map<string, string>();
  for (const raw of updates) {
    const chat = (raw as { message?: { chat?: Record<string, unknown> } })?.message?.chat;
    if (!chat || chat.id == null) continue;
    const id = String(chat.id);
    const title = [chat.title, chat.username, chat.first_name, chat.type].find(
      (value) => typeof value === "string" && value.trim(),
    );
    if (!map.has(id)) map.set(id, `${title ?? "Chat"} · ${id}`);
  }
  return [...map.entries()].map(([id, label]) => ({ id, label }));
}

export async function telegramRecentChats(token: string) {
  const result = await telegramCall(token, "getUpdates", {
    limit: 50,
    allowed_updates: ["message"],
  });
  return chatsFromTelegramUpdates(Array.isArray(result) ? result : []);
}

export async function telegramSetWebhook(token: string, url: string) {
  await telegramCall(token, "setWebhook", { url, allowed_updates: ["message"] });
}

export async function telegramDeleteWebhook(token: string) {
  await telegramCall(token, "deleteWebhook");
}

export function telegramCommandUrl(origin: string, secret: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/bots/telegram?secret=${secret}`;
}
