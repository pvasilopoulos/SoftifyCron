import { saveJobAction } from "@/app/actions/jobs";
import { CRON_PRESETS, HTTP_METHODS } from "@/lib/constants";
import { TIMEZONES, formatAbsolute } from "@/lib/format";
import { describeCron, previewRuns } from "@/lib/cron";

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
  error,
}: {
  initial?: Partial<JobFormValues>;
  jobId?: string;
  error?: string;
}) {
  const values = { ...DEFAULTS, ...initial };
  let upcoming: Date[] = [];
  let human = values.cronExpr;
  try {
    human = describeCron(values.cronExpr);
    upcoming = previewRuns(values.cronExpr, values.timezone, 4);
  } catch {
    human = values.cronExpr;
  }

  return (
    <form action={saveJobAction} className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Cron expression</span>
            <input
              className="field mono"
              name="cronExpr"
              list="cron-presets"
              defaultValue={values.cronExpr}
              required
            />
            <datalist id="cron-presets">
              {CRON_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value} label={preset.label} />
              ))}
            </datalist>
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
        </div>
        <p className="text-xs text-ink-dim">
          Standard 5-field cron. Examples: <span className="mono">*/15 * * * *</span> every 15
          minutes, <span className="mono">0 9 * * 1-5</span> weekdays at 09:00.
        </p>
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
        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <button className="btn btn-gold" type="submit">
          {jobId ? "Save job" : "Create job"}
        </button>
      </div>
      <aside className="card h-fit p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Current expression</p>
        <p className="mt-3 font-display text-2xl italic">{human}</p>
        <ol className="mt-5 space-y-2 text-sm text-ink-dim">
          {upcoming.map((date) => (
            <li key={date.toISOString()} className="mono">
              {formatAbsolute(date, values.timezone)}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-ink-dim">
          Preview is for the saved/default expression. After you create the job, the detail page
          shows the live upcoming times.
        </p>
      </aside>
    </form>
  );
}
