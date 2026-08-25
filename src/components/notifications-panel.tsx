"use client";

import { useState } from "react";
import { NotifyMatrix } from "@/components/notify-matrix";
import { NOTIFY_EVENTS } from "@/lib/notify-events";

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
  slackHasWebhook: boolean;
  hasSigningSecret: boolean;
  defaultNotifyEmailOn: string;
  defaultNotifyTelegramOn: string;
  defaultNotifyWebhookOn: string;
  defaultNotifySlackOn: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursAllow: string;
  notifyCooldownSec: number;
  signingSecret?: string;
};

export function NotificationsPanel({
  initial,
  canEdit,
  endpoint = "/api/tenant/notify",
}: {
  initial: NotifySettings;
  canEdit: boolean;
  endpoint?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState<"email" | "telegram" | "slack" | null>(null);
  const [secret, setSecret] = useState(initial.signingSecret ?? null);
  const [hasSecret, setHasSecret] = useState(initial.hasSigningSecret);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        notifyEmail: String(form.get("notifyEmail") ?? ""),
        smtpHost: String(form.get("smtpHost") ?? ""),
        smtpPort: String(form.get("smtpPort") ?? ""),
        smtpSecure: form.get("smtpSecure") === "on",
        smtpUser: String(form.get("smtpUser") ?? ""),
        smtpPass: String(form.get("smtpPass") ?? ""),
        smtpFrom: String(form.get("smtpFrom") ?? ""),
        telegramChatId: String(form.get("telegramChatId") ?? ""),
        telegramBotToken: String(form.get("telegramBotToken") ?? ""),
        clearTelegramToken: form.get("clearTelegramToken") === "on",
        slackWebhookUrl: String(form.get("slackWebhookUrl") ?? ""),
        clearSlackWebhook: form.get("clearSlackWebhook") === "on",
        rotateWebhookSecret: form.get("rotateWebhookSecret") === "on",
        defaultNotifyEmailOn: form.getAll("defaultNotifyEmailOn").map(String),
        defaultNotifyTelegramOn: form.getAll("defaultNotifyTelegramOn").map(String),
        defaultNotifyWebhookOn: form.getAll("defaultNotifyWebhookOn").map(String),
        defaultNotifySlackOn: form.getAll("defaultNotifySlackOn").map(String),
        quietHoursStart: String(form.get("quietHoursStart") ?? ""),
        quietHoursEnd: String(form.get("quietHoursEnd") ?? ""),
        quietHoursAllow: form.getAll("quietHoursAllow").map(String),
        notifyCooldownSec: String(form.get("notifyCooldownSec") ?? "300"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(data.error ?? "Save failed");
      return;
    }
    setHasSecret(Boolean(data.hasSigningSecret));
    if (data.signingSecret) setSecret(data.signingSecret);
    setStatus("Saved");
  }

  async function test(channel: "email" | "telegram" | "slack") {
    setTesting(channel);
    setStatus(null);
    const response = await fetch(endpoint, {
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
    setStatus(
      channel === "email"
        ? "Test email sent"
        : channel === "telegram"
          ? "Test Telegram sent"
          : "Test Slack sent",
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Recipients</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Alerts stay inside this workspace. Separate several emails or Telegram chats with commas.
        </p>
        <label className="mt-5 block">
          <span className="field-label">Alert emails</span>
          <textarea
            className="field min-h-20"
            name="notifyEmail"
            defaultValue={initial.notifyEmail}
            disabled={!canEdit}
            placeholder="ops@example.com, oncall@example.com"
          />
        </label>
        <label className="mt-4 block">
          <span className="field-label">Telegram chat ids</span>
          <textarea
            className="field min-h-20 mono"
            name="telegramChatId"
            defaultValue={initial.telegramChatId}
            disabled={!canEdit}
            placeholder="-100…, 123456789"
          />
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">SMTP</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Required for job emails. Password-reset mail still uses the server SMTP, not this workspace.
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
              placeholder="SoftifyCron &lt;cron@example.com&gt;"
            />
          </label>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Telegram bot</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Create a bot with @BotFather, then start a chat with it (or add it to a group) and paste the chat id.
        </p>
        <label className="mt-5 block">
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
        {initial.telegramHasToken ? (
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" name="clearTelegramToken" disabled={!canEdit} />
            <span className="text-sm">Remove saved bot token</span>
          </label>
        ) : null}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Slack</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Incoming webhook URL for this workspace. Slack-compatible endpoints (Mattermost, Discord slack-compat) work too.
        </p>
        <label className="mt-5 block">
          <span className="field-label">Webhook URL</span>
          <input
            className="field mono"
            name="slackWebhookUrl"
            type="password"
            disabled={!canEdit}
            placeholder={initial.slackHasWebhook ? "Leave blank to keep" : "https://hooks.slack.com/services/…"}
            autoComplete="off"
          />
        </label>
        {initial.slackHasWebhook ? (
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" name="clearSlackWebhook" disabled={!canEdit} />
            <span className="text-sm">Remove saved Slack webhook</span>
          </label>
        ) : null}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Defaults for new jobs</h2>
        <p className="mt-1 mb-4 text-sm text-ink-dim">
          Applied when someone creates a job. Existing jobs keep their own matrix.
        </p>
        <NotifyMatrix
          emailOn={initial.defaultNotifyEmailOn}
          telegramOn={initial.defaultNotifyTelegramOn}
          slackOn={initial.defaultNotifySlackOn}
          webhookOn={initial.defaultNotifyWebhookOn}
          names={{
            email: "defaultNotifyEmailOn",
            telegram: "defaultNotifyTelegramOn",
            slack: "defaultNotifySlackOn",
            webhook: "defaultNotifyWebhookOn",
          }}
        />
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Quiet hours</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Uses this workspace timezone. Overnight windows wrap (23:00–07:00). Empty start and end disables quiet hours.
        </p>
        <div className="mt-5 grid max-w-xl gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Start</span>
            <input
              className="field"
              type="time"
              name="quietHoursStart"
              defaultValue={initial.quietHoursStart}
              disabled={!canEdit}
            />
          </label>
          <label className="block">
            <span className="field-label">End</span>
            <input
              className="field"
              type="time"
              name="quietHoursEnd"
              defaultValue={initial.quietHoursEnd}
              disabled={!canEdit}
            />
          </label>
        </div>
        <p className="field-label mt-5">Still send during quiet hours</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {NOTIFY_EVENTS.map((event) => (
            <label key={event} className="flex min-h-10 items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                name="quietHoursAllow"
                value={event}
                defaultChecked={initial.quietHoursAllow.split(",").includes(event)}
                disabled={!canEdit}
              />
              {event}
            </label>
          ))}
        </div>
        <label className="mt-5 block max-w-xs">
          <span className="field-label">Anti-spam cooldown (seconds)</span>
          <input
            className="field"
            type="number"
            name="notifyCooldownSec"
            min={0}
            max={86400}
            defaultValue={initial.notifyCooldownSec}
            disabled={!canEdit}
          />
          <p className="mt-2 text-xs text-ink-dim">0 sends every event. 300 is one alert per channel per job every five minutes.</p>
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Webhook signing</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Job webhooks include <span className="mono">X-SoftifyCron-Signature</span> HMAC-SHA256 of{" "}
          <span className="mono">timestamp.body</span>. Shown once when created or rotated.
        </p>
        {hasSecret ? (
          <p className="mt-3 text-sm text-ink-dim">A signing secret is saved for this workspace.</p>
        ) : (
          <p className="mt-3 text-sm text-ink-dim">Saving notifications creates a signing secret.</p>
        )}
        {secret ? <p className="mono mt-3 break-all rounded-2xl bg-bg p-3 text-sm">{secret}</p> : null}
        {canEdit ? (
          <label className="mt-4 flex items-center gap-3">
            <input type="checkbox" name="rotateWebhookSecret" />
            <span className="text-sm">Rotate signing secret on save</span>
          </label>
        ) : null}
      </section>

      {canEdit ? (
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save notifications"}
          </button>
          <button className="btn btn-ghost" type="button" disabled={testing !== null} onClick={() => test("email")}>
            {testing === "email" ? "Sending…" : "Send test email"}
          </button>
          <button className="btn btn-ghost" type="button" disabled={testing !== null} onClick={() => test("telegram")}>
            {testing === "telegram" ? "Sending…" : "Send test Telegram"}
          </button>
          <button className="btn btn-ghost" type="button" disabled={testing !== null} onClick={() => test("slack")}>
            {testing === "slack" ? "Sending…" : "Send test Slack"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-dim">You do not have permission to edit workspace settings.</p>
      )}
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
