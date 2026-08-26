"use client";

import { useActionState, useState } from "react";
import { saveJobAction } from "@/app/actions/jobs";
import { HTTP_METHODS } from "@/lib/constants";
import { TIMEZONES } from "@/lib/format";
import { JOB_TYPES } from "@/lib/acl";
import { NotifyMatrix } from "@/components/notify-matrix";
import { FirePreview } from "@/components/fire-preview";
import { CronBuilder } from "@/components/cron-builder";
import { jobHeartbeatUrl } from "@/lib/app-url";
import { JOB_TEMPLATES } from "@/lib/job-templates";
import {
  DEFAULT_NOTIFY_EMAIL_ON,
  DEFAULT_NOTIFY_SLACK_ON,
  DEFAULT_NOTIFY_DISCORD_ON,
  DEFAULT_NOTIFY_SMS_ON,
  DEFAULT_NOTIFY_TELEGRAM_ON,
  DEFAULT_NOTIFY_WEBHOOK_ON,
} from "@/lib/notify-events";

type Group = { id: string; name: string };

type JobFormValues = {
  name: string;
  description: string;
  groupName: string;
  type: string;
  tags: string;
  cronExpr: string;
  timezone: string;
  method: (typeof HTTP_METHODS)[number];
  url: string;
  headers: string;
  body: string;
  timeoutMs: number;
  retryMax: number;
  retryDelaySec: number;
  notifyUrl: string;
  notifyEmailOn: string;
  notifyTelegramOn: string;
  notifyWebhookOn: string;
  notifySlackOn: string;
  notifyDiscordOn: string;
  notifySmsOn: string;
  keepResponse: boolean;
  responseBoard: boolean;
  pauseAfter: number;
  enabled: boolean;
  followUpJobId: string;
  dependsOnJobId: string;
  assertStatus: number;
  assertJsonPath: string;
  assertEquals: string;
  assertContains: string;
  slowAfterMs: number;
  skipHolidays: boolean;
  skipWeekends: boolean;
  activeHoursStart: string;
  activeHoursEnd: string;
  notes: string;
  sloFailPerDay: number;
  assigneeEmail: string;
  configLocked: boolean;
  authUrl: string;
  authBody: string;
  extraHosts: string;
  assertFinalUrl: string;
  assertJsonSchema: string;
  hookHmac: string;
  telegramTemplateId: string;
  telegramNote: string;
};

type JobOption = { id: string; name: string };
type TelegramTemplateOption = { id: string; name: string };

const DEFAULTS: JobFormValues = {
  name: "",
  description: "",
  groupName: "",
  type: "HTTP",
  tags: "",
  cronExpr: "*/5 * * * *",
  timezone: "Europe/Athens",
  method: "GET",
  url: "https://example.com",
  headers: "",
  body: "",
  timeoutMs: 30000,
  retryMax: 0,
  retryDelaySec: 60,
  notifyUrl: "",
  notifyEmailOn: DEFAULT_NOTIFY_EMAIL_ON,
  notifyTelegramOn: DEFAULT_NOTIFY_TELEGRAM_ON,
  notifyWebhookOn: DEFAULT_NOTIFY_WEBHOOK_ON,
  notifySlackOn: DEFAULT_NOTIFY_SLACK_ON,
  notifyDiscordOn: DEFAULT_NOTIFY_DISCORD_ON,
  notifySmsOn: DEFAULT_NOTIFY_SMS_ON,
  keepResponse: false,
  responseBoard: false,
  pauseAfter: 0,
  enabled: true,
  followUpJobId: "",
  dependsOnJobId: "",
  assertStatus: 0,
  assertJsonPath: "",
  assertEquals: "",
  assertContains: "",
  slowAfterMs: 0,
  skipHolidays: false,
  skipWeekends: false,
  activeHoursStart: "",
  activeHoursEnd: "",
  notes: "",
  sloFailPerDay: 0,
  assigneeEmail: "",
  configLocked: false,
  authUrl: "",
  authBody: "",
  extraHosts: "",
  assertFinalUrl: "",
  assertJsonSchema: "",
  hookHmac: "",
  telegramTemplateId: "",
  telegramNote: "",
};

export function JobForm({
  initial,
  jobId,
  groups,
  jobs = [],
  telegramTemplates = [],
  tenantHolidays = false,
}: {
  initial?: Partial<JobFormValues>;
  jobId?: string;
  groups: Group[];
  jobs?: JobOption[];
  telegramTemplates?: TelegramTemplateOption[];
  tenantHolidays?: boolean;
}) {
  const [seed, setSeed] = useState(() => ({ ...DEFAULTS, ...initial }));
  const values = seed;
  const [state, formAction, pending] = useActionState(saveJobAction, null);
  const heartbeatUrl = jobId ? jobHeartbeatUrl(jobId) : null;
  const [live, setLive] = useState({
    cronExpr: values.cronExpr,
    timezone: values.timezone,
    skipHolidays: values.skipHolidays,
    skipWeekends: values.skipWeekends,
    activeHoursStart: values.activeHoursStart,
    activeHoursEnd: values.activeHoursEnd,
  });

  function syncLive(form: HTMLFormElement) {
    const data = new FormData(form);
    setLive({
      cronExpr: String(data.get("cronExpr") ?? values.cronExpr),
      timezone: String(data.get("timezone") ?? values.timezone),
      skipHolidays: data.get("skipHolidays") === "on",
      skipWeekends: data.get("skipWeekends") === "on",
      activeHoursStart: String(data.get("activeHoursStart") ?? ""),
      activeHoursEnd: String(data.get("activeHoursEnd") ?? ""),
    });
  }

  return (
    <form
      key={`${seed.type}-${seed.cronExpr}-${seed.name}-${seed.url}`}
      action={formAction}
      autoComplete="off"
      className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
      onInput={(event) => syncLive(event.currentTarget)}
    >
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <div className="space-y-4">
        {!jobId ? (
          <div className="flex flex-wrap gap-2">
            {JOB_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="btn btn-ghost btn-sm"
                type="button"
                title={template.hint}
                onClick={() => {
                  const next = { ...DEFAULTS, ...initial, ...template.values, notes: seed.notes };
                  setSeed(next);
                  setLive({
                    cronExpr: next.cronExpr,
                    timezone: next.timezone,
                    skipHolidays: next.skipHolidays,
                    skipWeekends: next.skipWeekends,
                    activeHoursStart: next.activeHoursStart,
                    activeHoursEnd: next.activeHoursEnd,
                  });
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        ) : null}
        <label className="block">
          <span className="field-label">Name</span>
          <input className="field" name="name" defaultValue={values.name} required autoComplete="off" />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea className="field min-h-24" name="description" defaultValue={values.description} />
        </label>
        <label className="block">
          <span className="field-label">Ops notes</span>
          <textarea
            className="field min-h-20"
            name="notes"
            defaultValue={values.notes}
            placeholder="Changed the endpoint on 12/3. Expect 404 until tonight."
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Group</span>
            <input
              className="field"
              name="groupName"
              defaultValue={values.groupName}
              list="job-group-names"
              placeholder="Type a group name"
              autoComplete="off"
            />
            <datalist id="job-group-names">
              {groups.map((group) => (
                <option key={group.id} value={group.name} />
              ))}
            </datalist>
            <p className="mt-2 text-xs text-ink-dim">Leave blank for ungrouped. A new name creates the group.</p>
          </label>
          <label className="block">
            <span className="field-label">Type</span>
            <select className="field" name="type" defaultValue={values.type}>
              {JOB_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="field-label">Tags</span>
          <input className="field" name="tags" defaultValue={values.tags} placeholder="critical, nightly" />
        </label>
        <div className="block">
          <span className="field-label">Schedule</span>
          <CronBuilder defaultValue={values.cronExpr} />
        </div>
        <label className="block">
          <span className="field-label">Timezone</span>
          <select className="field" name="timezone" defaultValue={values.timezone}>
            {TIMEZONES.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="field-label">Method</span>
            <select className="field" name="method" defaultValue={values.method}>
              {HTTP_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Target</span>
            <input
              className="field mono"
              name="url"
              defaultValue={values.url}
              required
              placeholder="https://example.com or host:443"
            />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Headers JSON</span>
          <textarea
            className="field min-h-24 mono"
            name="headers"
            placeholder='{"Authorization":"Bearer {{SECRET:API_TOKEN}}"}'
            defaultValue={values.headers}
          />
        </label>
        <label className="block">
          <span className="field-label">Body</span>
          <textarea className="field min-h-28 mono" name="body" defaultValue={values.body} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Timeout ms</span>
            <input className="field" type="number" name="timeoutMs" defaultValue={values.timeoutMs} />
          </label>
          <label className="block">
            <span className="field-label">Retries</span>
            <input className="field" type="number" name="retryMax" min={0} max={10} defaultValue={values.retryMax} />
          </label>
          <label className="block">
            <span className="field-label">Retry delay s</span>
            <input className="field" type="number" name="retryDelaySec" defaultValue={values.retryDelaySec} />
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <p className="field-label">Notifications</p>
            <p className="mb-3 text-xs text-ink-dim">
              Pick channels per event. Email, Telegram, Slack, Discord, and SMS use Workspace → Notifications. Webhook uses the URL below.
            </p>
            <NotifyMatrix
              emailOn={values.notifyEmailOn}
              telegramOn={values.notifyTelegramOn}
              slackOn={values.notifySlackOn}
              discordOn={values.notifyDiscordOn}
              smsOn={values.notifySmsOn}
              webhookOn={values.notifyWebhookOn}
            />
          </div>
          <label className="block">
            <span className="field-label">Telegram message</span>
            <select className="field" name="telegramTemplateId" defaultValue={values.telegramTemplateId}>
              <option value="">Built-in default</option>
              {telegramTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-dim">
              Create templates in Workspace → Notifications. Leave default for the built-in Telegram text.
            </p>
          </label>
          <label className="block">
            <span className="field-label">Telegram note</span>
            <input
              className="field"
              name="telegramNote"
              defaultValue={values.telegramNote}
              maxLength={500}
              placeholder="Optional line for {{note}}"
            />
          </label>
          <label className="block">
            <span className="field-label">Webhook URL</span>
            <input className="field mono" name="notifyUrl" defaultValue={values.notifyUrl} placeholder="https://…" />
          </label>
        </div>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="enabled" defaultChecked={values.enabled} />
          <span>Armed — worker will fire this job</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="keepResponse" defaultChecked={values.keepResponse || values.responseBoard} />
          <span>Keep last response — stores bodies on each run</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="responseBoard" defaultChecked={values.responseBoard} />
          <span>Response board — adds a tab on Responses and shows a detailed grid</span>
        </label>
        <label className="block">
          <span className="field-label">Auto-pause after N failures</span>
          <input
            className="field"
            type="number"
            name="pauseAfter"
            min={0}
            max={100}
            defaultValue={values.pauseAfter}
          />
          <p className="mt-2 text-xs text-ink-dim">0 keeps the job armed forever. 3 pauses it after three consecutive failures.</p>
        </label>
        <label className="block">
          <span className="field-label">SLO fail budget / 24h</span>
          <input
            className="field"
            type="number"
            name="sloFailPerDay"
            min={0}
            max={100}
            defaultValue={values.sloFailPerDay}
          />
          <p className="mt-2 text-xs text-ink-dim">
            0 is off. If failed, timed-out, or blocked runs in the last 24 hours reach this number, fire an SLO alert.
          </p>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Run after (follow-up)</span>
            <select className="field" name="followUpJobId" defaultValue={values.followUpJobId}>
              <option value="">None</option>
              {jobs
                .filter((item) => item.id !== jobId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <p className="mt-2 text-xs text-ink-dim">Fires that job once after this one succeeds on a schedule or retry.</p>
          </label>
          <label className="block">
            <span className="field-label">Depends on</span>
            <select className="field" name="dependsOnJobId" defaultValue={values.dependsOnJobId}>
              <option value="">None</option>
              {jobs
                .filter((item) => item.id !== jobId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <p className="mt-2 text-xs text-ink-dim">Skip this schedule unless that job’s last run succeeded.</p>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Assert HTTP status / TLS days</span>
            <input
              className="field"
              type="number"
              name="assertStatus"
              min={0}
              max={3650}
              defaultValue={values.assertStatus}
            />
            <p className="mt-2 text-xs text-ink-dim">
              HTTP: 0 skips, 200 requires that status. TLS: minimum days left (14 if 0). DNS: put the expected IP in Equals.
            </p>
          </label>
          <label className="block">
            <span className="field-label">Slow after ms</span>
            <input
              className="field"
              type="number"
              name="slowAfterMs"
              min={0}
              defaultValue={values.slowAfterMs}
            />
            <p className="mt-2 text-xs text-ink-dim">0 uses 3× the median of the last 10 successes (minimum median + 2s).</p>
          </label>
        </div>
        <label className="block">
          <span className="field-label">Assert JSON path</span>
          <input
            className="field mono"
            name="assertJsonPath"
            defaultValue={values.assertJsonPath}
            placeholder="data.0.status"
          />
        </label>
        <label className="block">
          <span className="field-label">Assert equals</span>
          <input
            className="field mono"
            name="assertEquals"
            defaultValue={values.assertEquals}
            placeholder="ok"
          />
          <p className="mt-2 text-xs text-ink-dim">Compared to the JSON path value. Leave blank to only require the path to exist.</p>
        </label>
        <label className="block">
          <span className="field-label">Assert contains</span>
          <input className="field mono" name="assertContains" defaultValue={values.assertContains} />
          <p className="mt-2 text-xs text-ink-dim">Fails the run if this substring is missing from the body.</p>
        </label>
        <label className="block">
          <span className="field-label">Assert final URL contains</span>
          <input className="field mono" name="assertFinalUrl" defaultValue={values.assertFinalUrl} placeholder="https://example.com/app" />
        </label>
        <label className="block">
          <span className="field-label">JSON schema (lite)</span>
          <textarea
            className="field min-h-24 mono"
            name="assertJsonSchema"
            defaultValue={values.assertJsonSchema}
            placeholder='{"type":"object","required":["ok"],"properties":{"ok":{"type":"boolean"}}}'
          />
        </label>
        <label className="block">
          <span className="field-label">Login URL (cookie hop)</span>
          <input className="field mono" name="authUrl" defaultValue={values.authUrl} placeholder="https://example.com/login" />
        </label>
        <label className="block">
          <span className="field-label">Login body</span>
          <textarea className="field min-h-20 mono" name="authBody" defaultValue={values.authBody} placeholder='{"user":"…","pass":"{{SECRET:LOGIN}}"}' />
        </label>
        <label className="block">
          <span className="field-label">Extra TLS hosts</span>
          <textarea className="field min-h-20 mono" name="extraHosts" defaultValue={values.extraHosts} placeholder="www.example.com&#10;api.example.com" />
          <p className="mt-2 text-xs text-ink-dim">TLS jobs also check these hosts. One per line or comma-separated.</p>
        </label>
        <label className="block">
          <span className="field-label">Inbox assignee</span>
          <input className="field" name="assigneeEmail" defaultValue={values.assigneeEmail} placeholder="ops@example.com" />
        </label>
        <label className="block">
          <span className="field-label">Inbound HMAC</span>
          <select className="field" name="hookHmac" defaultValue={values.hookHmac}>
            <option value="">Off (path token is enough)</option>
            <option value="github">GitHub X-Hub-Signature-256</option>
            <option value="gitlab">GitLab X-Gitlab-Token</option>
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="configLocked" defaultChecked={values.configLocked} />
          <span>Lock target and schedule — only owners can change URL, cron, type, headers, or body</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="skipHolidays" defaultChecked={values.skipHolidays} />
          <span>Skip Greek public holidays (including Orthodox Easter)</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="skipWeekends" defaultChecked={values.skipWeekends} />
          <span>Skip Saturday and Sunday in this job’s timezone</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Active from</span>
            <input
              className="field"
              type="time"
              name="activeHoursStart"
              defaultValue={values.activeHoursStart}
            />
          </label>
          <label className="block">
            <span className="field-label">Active until</span>
            <input
              className="field"
              type="time"
              name="activeHoursEnd"
              defaultValue={values.activeHoursEnd}
            />
          </label>
        </div>
        <p className="text-xs text-ink-dim">Leave both empty to fire around the clock. Overnight windows wrap (22:00–06:00).</p>
        {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
        <button className="btn btn-gold w-full sm:w-auto" type="submit" disabled={pending}>
          {pending ? "Saving…" : jobId ? "Save job" : "Create job"}
        </button>
      </div>
      <aside className="card h-fit p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Next 10 fires</p>
        <div className="mt-4">
          <FirePreview
            cronExpr={live.cronExpr}
            timezone={live.timezone}
            skipHolidays={live.skipHolidays}
            skipWeekends={live.skipWeekends}
            activeHoursStart={live.activeHoursStart}
            activeHoursEnd={live.activeHoursEnd}
            tenantHolidays={tenantHolidays}
          />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-gold">Types</p>
        <ul className="mt-4 space-y-3 text-sm text-ink-dim">
          <li><b className="text-ink">HTTP</b> — generic request.</li>
          <li>
            <b className="text-ink">HEARTBEAT</b> — GET health ping. A missed beat fires if this job stays silent longer than its cron window. You can also ping{" "}
            <span className="mono text-gold-2">/api/v1/jobs/:id/heartbeat</span>
            {heartbeatUrl ? (
              <>
                {" "}
                (<span className="mono break-all">{heartbeatUrl}</span>)
              </>
            ) : (
              " after it is created"
            )}
            .
          </li>
          <li><b className="text-ink">WEBHOOK</b> — POST payload to an endpoint.</li>
          <li><b className="text-ink">TCP</b> — open host:port.</li>
          <li><b className="text-ink">DNS</b> — resolve a hostname, optional IP pin in Equals.</li>
          <li><b className="text-ink">TLS</b> — certificate expiry in days (Assert HTTP status).</li>
          <li><b className="text-ink">DOMAIN</b> — RDAP expiry via rdap.org (Assert HTTP status = minimum days, 14 if 0).</li>
        </ul>
        <p className="mt-5 text-sm text-ink-dim">
          Put secrets in headers as <span className="mono text-gold-2">{"{{SECRET:API_TOKEN}}"}</span>.
        </p>
        <p className="mt-4 text-sm text-ink-dim">
          Response bodies are stored only when Keep last response is on. Response board pins the job as a tab on Responses and renders JSON, CSV, or HTML tables as a grid.
        </p>
        <p className="mt-4 text-sm text-ink-dim">
          Skip next jumps over one fire. Auto-pause stops a flapping job after N failures so it stops paging you.
        </p>
        <p className="mt-4 text-sm text-ink-dim">
          Configure SMTP, Telegram, Slack, Discord, and SMS under Workspace → Notifications, then tick events on this job.
        </p>
        <p className="mt-4 text-sm text-ink-dim">
          Follow-up runs the other job once after a successful schedule. Depends-on skips this slot unless that parent last succeeded. Snooze lives on the job menu.
        </p>
      </aside>
    </form>
  );
}
