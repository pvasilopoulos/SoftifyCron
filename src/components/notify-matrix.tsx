"use client";

import { NOTIFY_EVENTS, NOTIFY_EVENT_LABELS, channelHasEvent } from "@/lib/notify-events";

export function NotifyMatrix({
  emailOn,
  telegramOn,
  slackOn = "",
  discordOn = "",
  smsOn = "",
  webhookOn,
  names,
}: {
  emailOn: string;
  telegramOn: string;
  slackOn?: string;
  discordOn?: string;
  smsOn?: string;
  webhookOn: string;
  names?: {
    email?: string;
    telegram?: string;
    slack?: string;
    discord?: string;
    sms?: string;
    webhook?: string;
  };
}) {
  const emailName = names?.email ?? "notifyEmailOn";
  const telegramName = names?.telegram ?? "notifyTelegramOn";
  const slackName = names?.slack ?? "notifySlackOn";
  const discordName = names?.discord ?? "notifyDiscordOn";
  const smsName = names?.sms ?? "notifySmsOn";
  const webhookName = names?.webhook ?? "notifyWebhookOn";

  return (
    <div className="notify-matrix">
      <div className="notify-head" aria-hidden="true">
        <span>When this job</span>
        <span>Email</span>
        <span>Telegram</span>
        <span>Slack</span>
        <span>Discord</span>
        <span>Webhook</span>
        <span>SMS</span>
      </div>
      {NOTIFY_EVENTS.map((event) => (
        <div className="notify-row" key={event}>
          <div>
            <p className="text-sm font-medium text-ink">{NOTIFY_EVENT_LABELS[event].title}</p>
            <p className="text-xs text-ink-dim">{NOTIFY_EVENT_LABELS[event].hint}</p>
          </div>
          <div className="notify-checks">
            <label className="notify-check">
              <input type="checkbox" name={emailName} value={event} defaultChecked={channelHasEvent(emailOn, event)} />
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
              <input type="checkbox" name={slackName} value={event} defaultChecked={channelHasEvent(slackOn, event)} />
              <span>Slack</span>
            </label>
            <label className="notify-check">
              <input
                type="checkbox"
                name={discordName}
                value={event}
                defaultChecked={channelHasEvent(discordOn, event)}
              />
              <span>Discord</span>
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
            <label className="notify-check">
              <input type="checkbox" name={smsName} value={event} defaultChecked={channelHasEvent(smsOn, event)} />
              <span>SMS</span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
