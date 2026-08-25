"use client";

import { useActionState } from "react";
import { saveJobAction } from "@/app/actions/jobs";
import { HTTP_METHODS, CRON_PRESETS } from "@/lib/constants";
import { TIMEZONES } from "@/lib/format";
import { JOB_TYPES } from "@/lib/acl";

type Group = { id: string; name: string };

type JobFormValues = {
  name: string;
  description: string;
  groupId: string;
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
  enabled: boolean;
};

const DEFAULTS: JobFormValues = {
  name: "",
  description: "",
  groupId: "",
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
  enabled: true,
};

export function JobForm({
  initial,
  jobId,
  groups,
}: {
  initial?: Partial<JobFormValues>;
  jobId?: string;
  groups: Group[];
}) {
  const values = { ...DEFAULTS, ...initial };
  const [state, formAction, pending] = useActionState(saveJobAction, null);

  return (
    <form action={formAction} autoComplete="off" className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <div className="space-y-4">
        <label className="block">
          <span className="field-label">Name</span>
          <input className="field" name="name" defaultValue={values.name} required autoComplete="off" />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea className="field min-h-24" name="description" defaultValue={values.description} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Group</span>
            <select className="field" name="groupId" defaultValue={values.groupId}>
              <option value="">Ungrouped</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
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
        <label className="block">
          <span className="field-label">Cron</span>
          <input className="field mono" name="cronExpr" defaultValue={values.cronExpr} required autoComplete="off" />
          <p className="mt-2 text-xs text-ink-dim">
            {CRON_PRESETS.map((preset) => preset.value).join(" · ")}
          </p>
        </label>
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
            <span className="field-label">URL</span>
            <input className="field mono" name="url" defaultValue={values.url} required />
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
        <label className="block">
          <span className="field-label">Failure webhook</span>
          <input className="field mono" name="notifyUrl" defaultValue={values.notifyUrl} placeholder="https://…" />
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="enabled" defaultChecked={values.enabled} />
          <span>Armed — worker will fire this job</span>
        </label>
        {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
        <button className="btn btn-gold w-full sm:w-auto" type="submit" disabled={pending}>
          {pending ? "Saving…" : jobId ? "Save job" : "Create job"}
        </button>
      </div>
      <aside className="card h-fit p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Types</p>
        <ul className="mt-4 space-y-3 text-sm text-ink-dim">
          <li><b className="text-ink">HTTP</b> — generic request.</li>
          <li><b className="text-ink">HEARTBEAT</b> — GET health ping.</li>
          <li><b className="text-ink">WEBHOOK</b> — POST payload to an endpoint.</li>
        </ul>
        <p className="mt-5 text-sm text-ink-dim">
          Put secrets in headers as <span className="mono text-gold-2">{"{{SECRET:API_TOKEN}}"}</span>.
        </p>
      </aside>
    </form>
  );
}
