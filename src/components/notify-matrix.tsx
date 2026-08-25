"use client";

import { NOTIFY_EVENTS, NOTIFY_EVENT_LABELS, channelHasEvent } from "@/lib/notify-events";

export function NotifyMatrix({
  emailOn,
  telegramOn,
  webhookOn,
}: {
  emailOn: string;
  telegramOn: string;
  webhookOn: string;
}) {
  return (
    <div className="notify-matrix">
      <div className="notify-head" aria-hidden="true">
        <span>When this job</span>
        <span>Email</span>
        <span>Telegram</span>
        <span>Webhook</span>
      </div>
      {NOTIFY_EVENTS.map((event) => (
        <div className="notify-row" key={event}>
          <div>
            <p className="text-sm font-medium text-ink">{NOTIFY_EVENT_LABELS[event].title}</p>
            <p className="text-xs text-ink-dim">{NOTIFY_EVENT_LABELS[event].hint}</p>
          </div>
          <label className="notify-check">
            <input
              type="checkbox"
              name="notifyEmailOn"
              value={event}
              defaultChecked={channelHasEvent(emailOn, event)}
            />
            <span>Email</span>
          </label>
          <label className="notify-check">
            <input
              type="checkbox"
              name="notifyTelegramOn"
              value={event}
              defaultChecked={channelHasEvent(telegramOn, event)}
            />
            <span>Telegram</span>
          </label>
          <label className="notify-check">
            <input
              type="checkbox"
              name="notifyWebhookOn"
              value={event}
              defaultChecked={channelHasEvent(webhookOn, event)}
            />
            <span>Webhook</span>
          </label>
        </div>
      ))}
    </div>
  );
}
