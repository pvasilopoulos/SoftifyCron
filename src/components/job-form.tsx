"use client";

import { useActionState } from "react";
import { saveJobAction } from "@/app/actions/jobs";
import { HTTP_METHODS } from "@/lib/constants";
import { TIMEZONES } from "@/lib/format";

type JobFormValues = {
  name: string;
  description: string;
  cronExpr: string;
  timezone: string;
  method: (typeof HTTP_METHODS)[number];
  url: string;
  headers: string;
  body: string;
  timeoutMs: number;
  enabled: boolean;
};

const DEFAULTS: JobFormValues = {
  name: "",
  description: "",
  cronExpr: "*/5 * * * *",
  timezone: "Europe/Athens",
  method: "GET",
  url: "https://example.com",
  headers: "",
  body: "",
  timeoutMs: 30000,
  enabled: true,
};

export function JobForm({
  initial,
  jobId,
}: {
  initial?: Partial<JobFormValues>;
  jobId?: string;
}) {
  const values = { ...DEFAULTS, ...initial };
  const [state, formAction, pending] = useActionState(saveJobAction, null);

  return (
    <form action={formAction} className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <div className="space-y-4">
        <label className="block">
          <span className="field-label">Name</span>
          <input className="field" name="name" defaultValue={values.name} required />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea className="field min-h-24" name="description" defaultValue={values.description} />
        </label>
        <label className="block">
          <span className="field-label">Cron expression</span>
          <input className="field mono" name="cronExpr" defaultValue={values.cronExpr} required />
          <span className="mt-2 block text-xs text-ink-dim">
            5-field cron, for example <span className="mono">*/15 * * * *</span> or{" "}
            <span className="mono">0 9 * * 1-5</span>
          </span>
        </label>
        <label className="block">
          <span className="field-label">Timezone</span>
          <select className="field" name="timezone" defaultValue={values.timezone}>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
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
            placeholder='{"Authorization":"Bearer …"}'
            defaultValue={values.headers}
          />
        </label>
        <label className="block">
          <span className="field-label">Body</span>
          <textarea className="field min-h-28 mono" name="body" defaultValue={values.body} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Timeout (ms)</span>
            <input
              className="field"
              type="number"
              name="timeoutMs"
              min={1000}
              max={120000}
              defaultValue={values.timeoutMs}
            />
          </label>
          <label className="flex items-end gap-3 pb-2">
            <input type="checkbox" name="enabled" defaultChecked={values.enabled} />
            <span>Enabled — worker will fire this job</span>
          </label>
        </div>
        {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Saving…" : jobId ? "Save job" : "Create job"}
        </button>
      </div>
      <aside className="card h-fit p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">How it runs</p>
        <p className="mt-3 text-sm leading-6 text-ink-dim">
          SoftifyCron stores this job on your tenant row in MySQL. The worker claims due jobs and
          sends the HTTP request. Open the job after saving to see the next fire times and run log.
        </p>
      </aside>
    </form>
  );
}
