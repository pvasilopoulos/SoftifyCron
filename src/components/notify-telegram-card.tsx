"use client";

import { useMemo, useState } from "react";
import { TelegramTemplatesPanel, type TelegramTemplateRow } from "@/components/telegram-templates-panel";
import { telegramCommandUrl } from "@/lib/telegram";
import type { TelegramBotInfo, TelegramChatHint } from "@/lib/telegram";

export function NotifyTelegramCard({
  initialChats,
  hasToken,
  commandSecret,
  canEdit,
  telegramEndpoint,
  templates,
  testing,
  onTest,
}: {
  initialChats: string;
  hasToken: boolean;
  commandSecret?: string;
  canEdit: boolean;
  telegramEndpoint: string;
  templates: TelegramTemplateRow[];
  testing: boolean;
  onTest: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [bot, setBot] = useState<TelegramBotInfo | null>(null);
  const [found, setFound] = useState<TelegramChatHint[]>([]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const commandUrl = useMemo(
    () => (commandSecret && origin ? telegramCommandUrl(origin, commandSecret) : ""),
    [commandSecret, origin],
  );

  async function run(action: "me" | "chats" | "hook" | "unhook") {
    setBusy(action);
    setStatus(null);
    const response = await fetch(telegramEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, origin }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setStatus(data.error ?? "Telegram request failed");
      return;
    }
    if (data.bot) setBot(data.bot as TelegramBotInfo);
    if (Array.isArray(data.chats)) setFound(data.chats as TelegramChatHint[]);
    if (action === "me") setStatus(data.bot?.username ? `Bot @${data.bot.username}` : "Bot is reachable");
    if (action === "chats") {
      setStatus(data.chats?.length ? `Found ${data.chats.length} recent chat${data.chats.length === 1 ? "" : "s"}` : "No recent chats. Message the bot first.");
    }
    if (action === "hook") setStatus("Telegram will POST commands to this workspace");
    if (action === "unhook") setStatus("Command webhook removed from Telegram");
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setStatus("Copied");
  }

  function fillChat(id: string) {
    const field = document.querySelector<HTMLTextAreaElement>('textarea[name="telegramChatId"]');
    if (!field) return;
    const have = new Set(
      field.value
        .split(/[,;\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    );
    have.add(id);
    field.value = [...have].join(", ");
    setStatus(`Added ${id}`);
  }

  return (
    <section id="notify-telegram" className="space-y-4">
      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">Telegram</h2>
        <p className="mt-1 text-sm text-ink-dim">
          One bot for this workspace. Alerts go to the chat ids below. Jobs pick a message template;
          cooldown and quiet hours still apply.
        </p>

        <ol className="notify-steps mt-5">
          <li>Create a bot with @BotFather and paste the token.</li>
          <li>Start a chat, or add the bot to a group / channel.</li>
          <li>Paste chat ids, or Discover after someone messages the bot.</li>
          <li>Optional: point Telegram’s webhook here so /ack /run /snooze work.</li>
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className={`job-chip ${hasToken ? "text-sage" : "job-chip-dim"}`}>
            {hasToken ? "Bot token saved" : "No bot token yet"}
          </span>
          {bot?.username ? <span className="job-chip">@{bot.username}</span> : null}
        </div>

        <label className="mt-5 block">
          <span className="field-label">Bot token</span>
          <input
            className="field mono"
            name="telegramBotToken"
            type="password"
            disabled={!canEdit}
            placeholder={hasToken ? "Leave blank to keep" : "123456:ABC…"}
            autoComplete="off"
          />
        </label>
        {hasToken ? (
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" name="clearTelegramToken" disabled={!canEdit} />
            <span className="text-sm">Remove saved bot token</span>
          </label>
        ) : null}

        <label className="mt-5 block">
          <span className="field-label">Chat ids</span>
          <textarea
            className="field min-h-20 mono"
            name="telegramChatId"
            defaultValue={initialChats}
            disabled={!canEdit}
            placeholder="-100…, 123456789"
          />
          <p className="mt-2 text-xs text-ink-dim">
            Groups are usually negative. Separate several with commas. @username also works if the bot can message it.
          </p>
        </label>

        {found.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {found.map((chat) => (
              <li key={chat.id}>
                <button className="job-chip" type="button" disabled={!canEdit} onClick={() => fillChat(chat.id)}>
                  {chat.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 border-t border-line pt-5">
          <p className="field-label">Commands</p>
          <p className="mt-1 text-sm text-ink-dim">
            From a configured chat: <span className="mono">/ack Job name</span>,{" "}
            <span className="mono">/run Job name</span>, <span className="mono">/snooze Job name 2</span>.
          </p>
          {commandUrl ? (
            <p className="mono mt-3 break-all rounded-2xl bg-bg p-3 text-xs">{commandUrl}</p>
          ) : (
            <p className="mt-3 text-sm text-ink-dim">Save a bot token to mint the command URL.</p>
          )}
        </div>

        {canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-ghost" type="button" disabled={testing} onClick={onTest}>
              {testing ? "Sending…" : "Send test"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy !== null || !hasToken}
              onClick={() => void run("me")}
            >
              {busy === "me" ? "Checking…" : "Check bot"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy !== null || !hasToken}
              onClick={() => void run("chats")}
            >
              {busy === "chats" ? "Looking…" : "Discover chats"}
            </button>
            {commandUrl ? (
              <button className="btn btn-ghost" type="button" onClick={() => void copy(commandUrl)}>
                Copy webhook
              </button>
            ) : null}
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy !== null || !hasToken || !origin}
              onClick={() => void run("hook")}
            >
              {busy === "hook" ? "Setting…" : "Set webhook"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy !== null || !hasToken}
              onClick={() => void run("unhook")}
            >
              {busy === "unhook" ? "Clearing…" : "Clear webhook"}
            </button>
          </div>
        ) : null}
        {status ? <p className="mt-3 text-sm text-ink-dim">{status}</p> : null}
        <p className="mt-3 text-xs text-ink-dim">
          Discover chats uses getUpdates. If a webhook is set, new messages will not appear there until you clear it.
        </p>
      </section>
      <TelegramTemplatesPanel initial={templates} canEdit={canEdit} />
    </section>
  );
}
