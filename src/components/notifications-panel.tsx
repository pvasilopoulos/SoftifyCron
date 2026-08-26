"use client";

import { useState } from "react";
import { NotifyMatrix } from "@/components/notify-matrix";
import { NotifyTelegramCard } from "@/components/notify-telegram-card";
import { NOTIFY_EVENTS } from "@/lib/notify-events";
import { WEEKDAYS } from "@/lib/maintenance";
import type { TelegramTemplateRow } from "@/components/telegram-templates-panel";

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
  discordHasWebhook: boolean;
  smsUrl: string;
  smsUser: string;
  smsFrom: string;
  smsTo: string;
  smsHasPassword: boolean;
  hasSigningSecret: boolean;
  defaultNotifyEmailOn: string;
  defaultNotifyTelegramOn: string;
  defaultNotifyWebhookOn: string;
  defaultNotifySlackOn: string;
  defaultNotifyDiscordOn: string;
  defaultNotifySmsOn: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursAllow: string;
  notifyCooldownSec: number;
  runRetentionDays: number;
  bodyKeepLast: number;
  maxConcurrent: number;
  catchUpMissed: boolean;
  skipGreekHolidays: boolean;
  escalateEmail: string;
  escalateAfter: number;
  statusPageEnabled: boolean;
  statusPageSlug: string;
  maintEnabled: boolean;
  maintStartWd: number;
  maintStartHm: string;
  maintEndWd: number;
  maintEndHm: string;
  maintMuteOnly: boolean;
  digestEnabled: boolean;
  digestHour: string;
  oncallEnabled: boolean;
  oncallRoster: string;
  signingSecret?: string;
  capJobs: number;
  capRunsMonth: number;
  statusLogoUrl: string;
  statusCustomHost: string;
  loginAllowIps: string;
  portalTokenPrefix: string;
  portalToken?: string;
  telegramCommandSecret?: string;
  slackCommandSecret?: string;
};

export function NotificationsPanel({
  initial,
  canEdit,
  endpoint = "/api/tenant/notify",
  telegramEndpoint = "/api/tenant/notify/telegram",
  telegramTemplates = [],
}: {
  initial: NotifySettings;
  canEdit: boolean;
  endpoint?: string;
  telegramEndpoint?: string;
  telegramTemplates?: TelegramTemplateRow[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState<"email" | "telegram" | "slack" | "discord" | "sms" | null>(null);
  const [secret, setSecret] = useState(initial.signingSecret ?? null);
  const [hasSecret, setHasSecret] = useState(initial.hasSigningSecret);
  const [portalToken, setPortalToken] = useState(initial.portalToken ?? null);

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
        discordWebhookUrl: String(form.get("discordWebhookUrl") ?? ""),
        clearDiscordWebhook: form.get("clearDiscordWebhook") === "on",
        smsUrl: String(form.get("smsUrl") ?? ""),
        smsUser: String(form.get("smsUser") ?? ""),
        smsPass: String(form.get("smsPass") ?? ""),
        smsFrom: String(form.get("smsFrom") ?? ""),
        smsTo: String(form.get("smsTo") ?? ""),
        rotateWebhookSecret: form.get("rotateWebhookSecret") === "on",
        defaultNotifyEmailOn: form.getAll("defaultNotifyEmailOn").map(String),
        defaultNotifyTelegramOn: form.getAll("defaultNotifyTelegramOn").map(String),
        defaultNotifyWebhookOn: form.getAll("defaultNotifyWebhookOn").map(String),
        defaultNotifySlackOn: form.getAll("defaultNotifySlackOn").map(String),
        defaultNotifyDiscordOn: form.getAll("defaultNotifyDiscordOn").map(String),
        defaultNotifySmsOn: form.getAll("defaultNotifySmsOn").map(String),
        quietHoursStart: String(form.get("quietHoursStart") ?? ""),
        quietHoursEnd: String(form.get("quietHoursEnd") ?? ""),
        quietHoursAllow: form.getAll("quietHoursAllow").map(String),
        notifyCooldownSec: String(form.get("notifyCooldownSec") ?? "300"),
        runRetentionDays: String(form.get("runRetentionDays") ?? "30"),
        bodyKeepLast: String(form.get("bodyKeepLast") ?? "20"),
        maxConcurrent: String(form.get("maxConcurrent") ?? "4"),
        catchUpMissed: form.get("catchUpMissed") === "on",
        skipGreekHolidays: form.get("skipGreekHolidays") === "on",
        escalateEmail: String(form.get("escalateEmail") ?? ""),
        escalateAfter: String(form.get("escalateAfter") ?? "3"),
        statusPageEnabled: form.get("statusPageEnabled") === "on",
        statusPageSlug: String(form.get("statusPageSlug") ?? ""),
        maintEnabled: form.get("maintEnabled") === "on",
        maintStartWd: String(form.get("maintStartWd") ?? "5"),
        maintStartHm: String(form.get("maintStartHm") ?? "22:00"),
        maintEndWd: String(form.get("maintEndWd") ?? "1"),
        maintEndHm: String(form.get("maintEndHm") ?? "07:00"),
        maintMuteOnly: form.get("maintMuteOnly") === "on",
        digestEnabled: form.get("digestEnabled") === "on",
        digestHour: String(form.get("digestHour") ?? "08:00"),
        oncallEnabled: form.get("oncallEnabled") === "on",
        oncallRoster: String(form.get("oncallRoster") ?? ""),
        capJobs: String(form.get("capJobs") ?? "0"),
        capRunsMonth: String(form.get("capRunsMonth") ?? "0"),
        statusLogoUrl: String(form.get("statusLogoUrl") ?? ""),
        statusCustomHost: String(form.get("statusCustomHost") ?? ""),
        loginAllowIps: String(form.get("loginAllowIps") ?? ""),
        rotatePortalToken: form.get("rotatePortalToken") === "on",
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
    if (data.portalToken) setPortalToken(data.portalToken);
    setStatus("Saved");
  }

  async function test(channel: "email" | "telegram" | "slack" | "discord" | "sms") {
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
    const labels: Record<typeof channel, string> = {
      email: "Test email sent",
      telegram: "Test Telegram sent",
      slack: "Test Slack sent",
      discord: "Test Discord sent",
      sms: "Test SMS sent",
    };
    setStatus(labels[channel]);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
        <h2 className="mt-1 font-display text-2xl">Notifications</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-dim">
          Channels live on this workspace. Each job then ticks which events to send. Quiet hours,
          cooldown, digest, and on-call wrap every channel except signed job webhooks.
        </p>
      </section>

      <nav className="notify-subnav" aria-label="Notification sections">
        {[
          ["notify-email", "Email"],
          ["notify-telegram", "Telegram"],
          ["notify-chat", "Chat apps"],
          ["notify-sms", "SMS"],
          ["notify-policy", "When to send"],
          ["notify-webhooks", "Job webhooks"],
          ["notify-workspace", "Workspace"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <section id="notify-email" className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">Email</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Alert mailboxes plus the SMTP this workspace uses for job mail. Password-reset still uses
          the server SMTP.
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
        <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="field-label">SMTP host</span>
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
        {canEdit ? (
          <button className="btn btn-ghost mt-5" type="button" disabled={testing !== null} onClick={() => test("email")}>
            {testing === "email" ? "Sending…" : "Send test email"}
          </button>
        ) : null}
      </section>

      <NotifyTelegramCard
        initialChats={initial.telegramChatId}
        hasToken={initial.telegramHasToken}
        commandSecret={initial.telegramCommandSecret}
        canEdit={canEdit}
        telegramEndpoint={telegramEndpoint}
        templates={telegramTemplates}
        testing={testing === "telegram"}
        onTest={() => test("telegram")}
      />

      <div id="notify-chat" className="space-y-4">
      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">Slack</h2>
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
        {initial.slackCommandSecret ? (
          <p className="mono mt-4 break-all text-xs text-ink-dim">
            Slash commands: POST /api/bots/slack?secret={initial.slackCommandSecret}
          </p>
        ) : null}
        {canEdit ? (
          <button className="btn btn-ghost mt-4" type="button" disabled={testing !== null} onClick={() => test("slack")}>
            {testing === "slack" ? "Sending…" : "Send test Slack"}
          </button>
        ) : null}
      </section>

      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">Discord</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Incoming webhook URL from a Discord channel. Paste the https://discord.com/api/webhooks/… link.
        </p>
        <label className="mt-5 block">
          <span className="field-label">Webhook URL</span>
          <input
            className="field mono"
            name="discordWebhookUrl"
            type="password"
            disabled={!canEdit}
            placeholder={initial.discordHasWebhook ? "Leave blank to keep" : "https://discord.com/api/webhooks/…"}
            autoComplete="off"
          />
        </label>
        {initial.discordHasWebhook ? (
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" name="clearDiscordWebhook" disabled={!canEdit} />
            <span className="text-sm">Remove saved Discord webhook</span>
          </label>
        ) : null}
        {canEdit ? (
          <button className="btn btn-ghost mt-4" type="button" disabled={testing !== null} onClick={() => test("discord")}>
            {testing === "discord" ? "Sending…" : "Send test Discord"}
          </button>
        ) : null}
      </section>
      </div>

      <section id="notify-sms" className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">SMS</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Generic HTTPS JSON POST: from, to[], text, user, pass. Use any provider that accepts this shape.
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="field-label">Gateway URL</span>
            <input
              className="field mono"
              name="smsUrl"
              defaultValue={initial.smsUrl}
              disabled={!canEdit}
              placeholder="https://sms.example.com/send"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="field-label">User</span>
            <input className="field" name="smsUser" defaultValue={initial.smsUser} disabled={!canEdit} autoComplete="off" />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="field"
              type="password"
              name="smsPass"
              disabled={!canEdit}
              placeholder={initial.smsHasPassword ? "Leave blank to keep" : "Optional"}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="field-label">From</span>
            <input className="field" name="smsFrom" defaultValue={initial.smsFrom} disabled={!canEdit} placeholder="SoftifyCron" />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">To</span>
            <textarea
              className="field min-h-20"
              name="smsTo"
              defaultValue={initial.smsTo}
              disabled={!canEdit}
              placeholder="+3069…, +447…"
            />
          </label>
        </div>
        {canEdit ? (
          <button className="btn btn-ghost mt-5" type="button" disabled={testing !== null} onClick={() => test("sms")}>
            {testing === "sms" ? "Sending…" : "Send test SMS"}
          </button>
        ) : null}
      </section>

      <div id="notify-policy" className="space-y-4">
      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Policy</p>
        <h2 className="mt-1 font-display text-2xl">Defaults for new jobs</h2>
        <p className="mt-1 mb-4 text-sm text-ink-dim">
          Applied when someone creates a job. Existing jobs keep their own matrix.
        </p>
        <NotifyMatrix
          emailOn={initial.defaultNotifyEmailOn}
          telegramOn={initial.defaultNotifyTelegramOn}
          slackOn={initial.defaultNotifySlackOn}
          discordOn={initial.defaultNotifyDiscordOn}
          smsOn={initial.defaultNotifySmsOn}
          webhookOn={initial.defaultNotifyWebhookOn}
          names={{
            email: "defaultNotifyEmailOn",
            telegram: "defaultNotifyTelegramOn",
            slack: "defaultNotifySlackOn",
            discord: "defaultNotifyDiscordOn",
            sms: "defaultNotifySmsOn",
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
        <h2 className="font-display text-2xl">Escalation</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Extra email copy after consecutive failures, bypassing the cooldown. Uses this workspace SMTP.
        </p>
        <label className="mt-5 block">
          <span className="field-label">Escalate emails</span>
          <textarea
            className="field min-h-20"
            name="escalateEmail"
            defaultValue={initial.escalateEmail}
            disabled={!canEdit}
            placeholder="oncall@example.com"
          />
        </label>
        <label className="mt-4 block max-w-xs">
          <span className="field-label">After N consecutive failures</span>
          <input
            className="field"
            type="number"
            name="escalateAfter"
            min={1}
            max={100}
            defaultValue={initial.escalateAfter}
            disabled={!canEdit}
          />
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Daily digest</h2>
        <p className="mt-1 text-sm text-ink-dim">
          One summary at this hour in the workspace timezone, using the same email / Telegram / Slack as alerts.
        </p>
        <label className="mt-5 flex min-h-12 items-center gap-3">
          <input type="checkbox" name="digestEnabled" defaultChecked={initial.digestEnabled} disabled={!canEdit} />
          <span className="text-sm">Send a daily digest</span>
        </label>
        <label className="mt-4 block max-w-xs">
          <span className="field-label">Hour</span>
          <input className="field" type="time" name="digestHour" defaultValue={initial.digestHour} disabled={!canEdit} />
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">On-call rotation</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Weekly roster in this workspace timezone, Monday start. The current person is prepended to alert and digest emails.
        </p>
        <label className="mt-5 flex min-h-12 items-center gap-3">
          <input type="checkbox" name="oncallEnabled" defaultChecked={initial.oncallEnabled} disabled={!canEdit} />
          <span className="text-sm">Enable weekly on-call rotation</span>
        </label>
        <label className="mt-4 block">
          <span className="field-label">Roster emails</span>
          <textarea
            className="field min-h-20"
            name="oncallRoster"
            defaultValue={initial.oncallRoster}
            disabled={!canEdit}
            placeholder="alice@example.com, bob@example.com"
          />
        </label>
      </section>
      </div>

      <div id="notify-workspace" className="space-y-4">
      <section className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Workspace</p>
        <h2 className="mt-1 font-display text-2xl">Retention and load</h2>
        <p className="mt-1 text-sm text-ink-dim">
          History pruning runs after each job. 0 days keeps runs forever. 0 bodies keeps every stored response.
        </p>
        <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Keep runs (days)</span>
            <input
              className="field"
              type="number"
              name="runRetentionDays"
              min={0}
              max={3650}
              defaultValue={initial.runRetentionDays}
              disabled={!canEdit}
            />
          </label>
          <label className="block">
            <span className="field-label">Keep last bodies</span>
            <input
              className="field"
              type="number"
              name="bodyKeepLast"
              min={0}
              max={500}
              defaultValue={initial.bodyKeepLast}
              disabled={!canEdit}
            />
          </label>
          <label className="block">
            <span className="field-label">Max concurrent</span>
            <input
              className="field"
              type="number"
              name="maxConcurrent"
              min={1}
              max={25}
              defaultValue={initial.maxConcurrent}
              disabled={!canEdit}
            />
          </label>
        </div>
        <label className="mt-4 flex min-h-12 items-center gap-3">
          <input type="checkbox" name="catchUpMissed" defaultChecked={initial.catchUpMissed} disabled={!canEdit} />
          <span className="text-sm">Catch up overdue slots instead of skipping them</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="skipGreekHolidays"
            defaultChecked={initial.skipGreekHolidays}
            disabled={!canEdit}
          />
          <span className="text-sm">Skip Greek public holidays for every job in this workspace</span>
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Public status page</h2>
        <p className="mt-1 text-sm text-ink-dim">
          A read-only page with job names and last status. No URLs, headers, or bodies.
        </p>
        <label className="mt-5 flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="statusPageEnabled"
            defaultChecked={initial.statusPageEnabled}
            disabled={!canEdit}
          />
          <span className="text-sm">Publish status page</span>
        </label>
        <label className="mt-4 block max-w-md">
          <span className="field-label">Slug</span>
          <input
            className="field mono"
            name="statusPageSlug"
            defaultValue={initial.statusPageSlug}
            disabled={!canEdit}
            placeholder="aurora"
          />
          <p className="mt-2 text-xs text-ink-dim">
            Live at /status/{initial.statusPageSlug || "your-slug"} · badge at /status/{initial.statusPageSlug || "your-slug"}/badge
          </p>
        </label>
        <label className="mt-4 block max-w-md">
          <span className="field-label">Logo URL</span>
          <input className="field" name="statusLogoUrl" defaultValue={initial.statusLogoUrl} disabled={!canEdit} placeholder="https://…" />
        </label>
        <label className="mt-4 block max-w-md">
          <span className="field-label">Custom host</span>
          <input className="field mono" name="statusCustomHost" defaultValue={initial.statusCustomHost} disabled={!canEdit} placeholder="status.example.com" />
        </label>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Maintenance window</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Skip scheduled fires (or only mute alerts) from a weekday+time to another. Default is Friday 22:00 → Monday 07:00.
        </p>
        <label className="mt-5 flex min-h-12 items-center gap-3">
          <input type="checkbox" name="maintEnabled" defaultChecked={initial.maintEnabled} disabled={!canEdit} />
          <span className="text-sm">Enable workspace maintenance window</span>
        </label>
        <label className="mt-3 flex min-h-12 items-center gap-3">
          <input type="checkbox" name="maintMuteOnly" defaultChecked={initial.maintMuteOnly} disabled={!canEdit} />
          <span className="text-sm">Still run jobs, only mute alerts</span>
        </label>
        <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">From weekday</span>
            <select className="field" name="maintStartWd" defaultValue={String(initial.maintStartWd)} disabled={!canEdit}>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">From time</span>
            <input className="field" type="time" name="maintStartHm" defaultValue={initial.maintStartHm} disabled={!canEdit} />
          </label>
          <label className="block">
            <span className="field-label">Until weekday</span>
            <select className="field" name="maintEndWd" defaultValue={String(initial.maintEndWd)} disabled={!canEdit}>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>{day}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Until time</span>
            <input className="field" type="time" name="maintEndHm" defaultValue={initial.maintEndHm} disabled={!canEdit} />
          </label>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Caps, portal, login IPs</h2>
        <p className="mt-1 text-sm text-ink-dim">0 means unlimited. Caps skip scheduled fires at 100% and warn on Usage at 80%.</p>
        <div className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Job cap</span>
            <input className="field" type="number" name="capJobs" min={0} defaultValue={initial.capJobs} disabled={!canEdit} />
          </label>
          <label className="block">
            <span className="field-label">Runs / month cap</span>
            <input className="field" type="number" name="capRunsMonth" min={0} defaultValue={initial.capRunsMonth} disabled={!canEdit} />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="field-label">Login IP allowlist</span>
          <textarea
            className="field min-h-20 mono"
            name="loginAllowIps"
            defaultValue={initial.loginAllowIps}
            disabled={!canEdit}
            placeholder="10.0.0.0/8, 203.0.113.10"
          />
        </label>
        <p className="mt-3 text-sm text-ink-dim">
          Client portal prefix {initial.portalTokenPrefix || "none"}. Tick rotate to mint a new /portal/… token (shown once).
        </p>
        {portalToken ? <p className="mono mt-3 break-all rounded-2xl bg-bg p-3 text-sm">{portalToken}</p> : null}
        {canEdit ? (
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" name="rotatePortalToken" />
            <span className="text-sm">Rotate client portal token</span>
          </label>
        ) : null}
      </section>
      </div>

      <section id="notify-webhooks" className="card p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Channel</p>
        <h2 className="mt-1 font-display text-2xl">Job webhooks</h2>
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
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save notifications"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-dim">You do not have permission to edit workspace settings.</p>
      )}
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
