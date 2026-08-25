"use client";

import { useState } from "react";

export type NotifySettings = {
  notifyEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
  smtpHasPassword: boolean;
  telegramChatId: string;
  telegramHasToken: boolean;
  envSmtp: boolean;
};

export function NotificationsPanel({
  initial,
  canEdit,
}: {
  initial: NotifySettings;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState<"email" | "telegram" | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tenant/notify", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        notifyEmail: String(form.get("notifyEmail") ?? ""),
        smtpHost: String(form.get("smtpHost") ?? ""),
        smtpPort: Number(form.get("smtpPort") ?? 587),
        smtpSecure: form.get("smtpSecure") === "on",
        smtpUser: String(form.get("smtpUser") ?? ""),
        smtpPass: String(form.get("smtpPass") ?? ""),
        smtpFrom: String(form.get("smtpFrom") ?? ""),
        telegramChatId: String(form.get("telegramChatId") ?? ""),
        telegramBotToken: String(form.get("telegramBotToken") ?? ""),
        clearTelegramToken: form.get("clearTelegramToken") === "on",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    setStatus(response.ok ? "Saved" : data.error ?? "Save failed");
  }

  async function test(channel: "email" | "telegram") {
    setTesting(channel);
    setStatus(null);
    const response = await fetch("/api/tenant/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = await response.json().catch(() => ({}));
    setTesting(null);
    if (!response.ok) {
      setStatus(data.error ?? "Test failed");
      return;
    }
    if (channel === "email" && data.logged) {
      setStatus("SMTP is not configured — the test was logged on the server");
      return;
    }
    setStatus(channel === "email" ? "Test email sent" : "Test Telegram sent");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="card p-6">
        <h2 className="font-display text-2xl">Alert destination</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Jobs pick which events go to email, Telegram, or a webhook. This is the mailbox and bot they use.
        </p>
        <label className="mt-5 block max-w-lg">
          <span className="field-label">Alert email</span>
          <input
            className="field"
            type="email"
            name="notifyEmail"
            defaultValue={initial.notifyEmail}
            disabled={!canEdit}
            placeholder="ops@example.com"
          />
        </label>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">SMTP</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Optional per workspace. If empty, job alerts fall back to server SMTP
          {initial.envSmtp ? " (configured)." : " (not configured — alerts are logged)."}
          Password-reset mail always uses the server SMTP.
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="field-label">Host</span>
            <input
              className="field"
              name="smtpHost"
              defaultValue={initial.smtpHost}
              disabled={!canEdit}
              placeholder="smtp.example.com"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="field-label">Port</span>
            <input
              className="field"
              type="number"
              name="smtpPort"
              defaultValue={initial.smtpPort}
              disabled={!canEdit}
            />
          </label>
          <label className="flex min-h-12 items-end gap-3 pb-2">
            <input type="checkbox" name="smtpSecure" defaultChecked={initial.smtpSecure} disabled={!canEdit} />
            <span className="text-sm">TLS (port 465)</span>
          </label>
          <label className="block">
            <span className="field-label">Username</span>
            <input
              className="field"
              name="smtpUser"
              defaultValue={initial.smtpUser}
              disabled={!canEdit}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="field"
              type="password"
              name="smtpPass"
              disabled={!canEdit}
              placeholder={initial.smtpHasPassword ? "Leave blank to keep" : "Optional"}
              autoComplete="new-password"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">From</span>
            <input
              className="field"
              name="smtpFrom"
              defaultValue={initial.smtpFrom}
              disabled={!canEdit}
              placeholder="SoftifyCron <cron@example.com>"
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Telegram</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Create a bot with @BotFather, then start a chat with it (or add it to a group) and paste the chat id.
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="field-label">Bot token</span>
            <input
              className="field mono"
              name="telegramBotToken"
              type="password"
              disabled={!canEdit}
              placeholder={initial.telegramHasToken ? "Leave blank to keep" : "123456:ABC…"}
              autoComplete="off"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Chat id</span>
            <input
              className="field mono"
              name="telegramChatId"
              defaultValue={initial.telegramChatId}
              disabled={!canEdit}
              placeholder="-100… or 123456789"
              autoComplete="off"
            />
          </label>
          {initial.telegramHasToken ? (
            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" name="clearTelegramToken" disabled={!canEdit} />
              <span className="text-sm">Remove saved bot token</span>
            </label>
          ) : null}
        </div>
      </section>

      {canEdit ? (
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save notifications"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={testing !== null}
            onClick={() => test("email")}
          >
            {testing === "email" ? "Sending…" : "Send test email"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={testing !== null}
            onClick={() => test("telegram")}
          >
            {testing === "telegram" ? "Sending…" : "Send test Telegram"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-dim">You do not have permission to edit workspace settings.</p>
      )}
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
