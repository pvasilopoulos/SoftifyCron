"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { CRON_PRESETS, HTTP_METHODS } from "@/lib/constants";
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

const EMPTY: JobFormValues = {
  name: "",
  description: "",
  cronExpr: "*/5 * * * *",
  timezone: "Europe/Athens",
  method: "GET",
  url: "https://",
  headers: "",
  body: "",
  timeoutMs: 30000,
  enabled: true,
};

function parseHeaders(raw: string): Record<string, string> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Headers must be a JSON object of string values");
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error("Header values must be strings");
    }
    out[key] = value;
  }
  return out;
}

export function JobForm({
  initial,
  jobId,
}: {
  initial?: Partial<JobFormValues>;
  jobId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    try {
      const human = cronstrue.toString(values.cronExpr, {
        use24HourTimeFormat: true,
      });
      const expression = CronExpressionParser.parse(values.cronExpr, {
        currentDate: new Date(),
        tz: values.timezone,
      });
      const next = Array.from({ length: 4 }, () => expression.next().toDate());
      return { human, next, error: null as string | null };
    } catch (err) {
      return {
        human: null,
        next: [] as Date[],
        error: err instanceof Error ? err.message : "Invalid cron expression",
      };
    }
  }, [values.cronExpr, values.timezone]);

  function update<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const headers = parseHeaders(values.headers);
      const payload = {
        name: values.name,
        description: values.description || null,
        cronExpr: values.cronExpr,
        timezone: values.timezone,
        method: values.method,
        url: values.url,
        headers,
        body: values.body || null,
        timeoutMs: Number(values.timeoutMs),
        enabled: values.enabled,
      };
      const response = await fetch(jobId ? `/api/jobs/${jobId}` : "/api/jobs", {
        method: jobId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      router.push(`/jobs/${data.job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <label className="block">
          <span className="field-label">Name</span>
          <input
            className="field"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea
            className="field min-h-24"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Cron expression</span>
            <input
              className="field mono"
              value={values.cronExpr}
              onChange={(e) => update("cronExpr", e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Timezone</span>
            <select
              className="field"
              value={values.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-dim hover:border-gold hover:text-gold"
              onClick={() => update("cronExpr", preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="field-label">Method</span>
            <select
              className="field"
              value={values.method}
              onChange={(e) =>
                update("method", e.target.value as JobFormValues["method"])
              }
            >
              {HTTP_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">URL</span>
            <input
              className="field mono"
              value={values.url}
              onChange={(e) => update("url", e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Headers JSON</span>
          <textarea
            className="field min-h-24 mono"
            placeholder='{"Authorization":"Bearer …"}'
            value={values.headers}
            onChange={(e) => update("headers", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Body</span>
          <textarea
            className="field min-h-28 mono"
            value={values.body}
            onChange={(e) => update("body", e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Timeout (ms)</span>
            <input
              className="field"
              type="number"
              min={1000}
              max={120000}
              value={values.timeoutMs}
              onChange={(e) => update("timeoutMs", Number(e.target.value))}
            />
          </label>
          <label className="flex items-end gap-3 pb-2">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            <span>Enabled — worker will fire this job</span>
          </label>
        </div>
        {error ? <p className="text-sm text-rose">{error}</p> : null}
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Saving…" : jobId ? "Save job" : "Create job"}
        </button>
      </div>
      <aside className="card h-fit p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Schedule</p>
        <p className="mt-3 font-display text-2xl italic">
          {preview.human ?? "Fix the expression"}
        </p>
        {preview.error ? (
          <p className="mt-3 text-sm text-rose">{preview.error}</p>
        ) : (
          <ol className="mt-5 space-y-2 text-sm text-ink-dim">
            {preview.next.map((date) => (
              <li key={date.toISOString()} className="mono">
                {date.toLocaleString("en-GB", {
                  timeZone: values.timezone,
                  hour12: false,
                })}
              </li>
            ))}
          </ol>
        )}
      </aside>
    </form>
  );
}
