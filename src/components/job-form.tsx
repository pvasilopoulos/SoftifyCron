"use client";

import { useMemo, useRef, useState } from "react";
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

const DEFAULTS: JobFormValues = {
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
  const cronRef = useRef<HTMLInputElement>(null);
  const values = { ...DEFAULTS, ...initial };
  const [cronExpr, setCronExpr] = useState(values.cronExpr);
  const [timezone, setTimezone] = useState(values.timezone);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    try {
      const human = cronstrue.toString(cronExpr, { use24HourTimeFormat: true });
      const expression = CronExpressionParser.parse(cronExpr, {
        currentDate: new Date(),
        tz: timezone,
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
  }, [cronExpr, timezone]);

  function applyPreset(value: string) {
    if (cronRef.current) cronRef.current.value = value;
    setCronExpr(value);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const headers = parseHeaders(String(form.get("headers") ?? ""));
      const payload = {
        name: String(form.get("name") ?? "").trim(),
        description: String(form.get("description") ?? "") || null,
        cronExpr: String(form.get("cronExpr") ?? "").trim(),
        timezone: String(form.get("timezone") ?? timezone),
        method: String(form.get("method") ?? "GET"),
        url: String(form.get("url") ?? "").trim(),
        headers,
        body: String(form.get("body") ?? "") || null,
        timeoutMs: Number(form.get("timeoutMs") ?? 30000),
        enabled: form.get("enabled") === "on",
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
    <form onSubmit={onSubmit} className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <label className="block">
          <span className="field-label">Name</span>
          <input className="field" name="name" defaultValue={values.name} required />
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea
            className="field min-h-24"
            name="description"
            defaultValue={values.description}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Cron expression</span>
            <input
              ref={cronRef}
              className="field mono"
              name="cronExpr"
              defaultValue={values.cronExpr}
              required
              onInput={(event) => setCronExpr(event.currentTarget.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Timezone</span>
            <select
              className="field"
              name="timezone"
              defaultValue={values.timezone}
              onChange={(event) => setTimezone(event.currentTarget.value)}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="cron-preset">
            Cron preset
          </label>
          <select
            id="cron-preset"
            className="field max-w-xs py-1"
            defaultValue=""
            onChange={(event) => {
              if (event.currentTarget.value) applyPreset(event.currentTarget.value);
              event.currentTarget.selectedIndex = 0;
            }}
          >
            <option value="">Apply a preset…</option>
            {CRON_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-dim hover:border-gold hover:text-gold"
              onClick={() => applyPreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
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
                  timeZone: timezone,
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
