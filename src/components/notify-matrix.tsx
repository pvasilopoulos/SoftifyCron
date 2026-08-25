"use client";

import { NOTIFY_EVENTS, NOTIFY_EVENT_LABELS, channelHasEvent } from "@/lib/notify-events";

export function NotifyMatrix({
  emailOn,
  telegramOn,
  slackOn = "",
  webhookOn,
  names,
}: {
  emailOn: string;
  telegramOn: string;
  slackOn?: string;
  webhookOn: string;
  names?: {
    email?: string;
    telegram?: string;
    slack?: string;
    webhook?: string;
  };
}) {
  const emailName = names?.email ?? "notifyEmailOn";
  const telegramName = names?.telegram ?? "notifyTelegramOn";
  const slackName = names?.slack ?? "notifySlackOn";
  const webhookName = names?.webhook ?? "notifyWebhookOn";

  return (
    <div className="notify-matrix">
      <div className="notify-head" aria-hidden="true">
        <span>When this job</span>
        <span>Email</span>
        <span>Telegram</span>
        <span>Slack</span>
        <span>Webhook</span>
      </div>
      {NOTIFY_EVENTS.map((event) => (
        <div className="notify-row" key={event}>
          <div>
            <p className="text-sm font-medium text-ink">{NOTIFY_EVENT_LABELS[event].title}</p>
            <p className="text-xs text-ink-dim">{NOTIFY_EVENT_LABELS[event].hint}</p>
          </div>
          <div className="notify-checks">
            <label className="notify-check">
              <input
                type="checkbox"
                name={emailName}
                value={event}
                defaultChecked={channelHasEvent(emailOn, event)}
              />
              <span>Email</span>
            </label>
            <label className="notify-check">
              <input
                type="checkbox"
                name={telegramName}
                value={event}
                defaultChecked={channelHasEvent(telegramOn, event)}
              />
              <span>Telegram</span>
            </label>
            <label className="notify-check">
              <input
                type="checkbox"
                name={slackName}
                value={event}
                defaultChecked={channelHasEvent(slackOn, event)}
              />
              <span>Slack</span>
            </label>
            <label className="notify-check">
              <input
                type="checkbox"
                name={webhookName}
                value={event}
                defaultChecked={channelHasEvent(webhookOn, event)}
              />
              <span>Webhook</span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
