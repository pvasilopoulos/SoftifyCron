"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildCron, parseCronDraft, type CronMode } from "@/lib/cron-builder";
import { CRON_PRESETS } from "@/lib/constants";

const MODES: { id: CronMode; label: string }[] = [
  { id: "minutes", label: "Every N minutes" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekly", label: "Weekly" },
  { id: "custom", label: "Cron expression" },
];

export function CronBuilder({ name = "cronExpr", defaultValue }: { name?: string; defaultValue: string }) {
  const [draft, setDraft] = useState(() => parseCronDraft(defaultValue));
  const value = useMemo(() => buildCron(draft), [draft]);
  const hiddenRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [value]);

  return (
    <div className="space-y-3">
      <input ref={hiddenRef} type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            className={`btn btn-sm ${draft.mode === mode.id ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setDraft((current) => ({ ...current, mode: mode.id, raw: value }))}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {draft.mode === "minutes" ? (
        <label className="block">
          <span className="field-label">Every</span>
          <input
            className="field"
            type="number"
            min={1}
            max={59}
            value={draft.every}
            onChange={(event) => setDraft((current) => ({ ...current, every: Number(event.target.value) }))}
          />
        </label>
      ) : null}
      {draft.mode === "hourly" ? (
        <label className="block">
          <span className="field-label">Minute</span>
          <input
            className="field"
            type="number"
            min={0}
            max={59}
            value={draft.minute}
            onChange={(event) => setDraft((current) => ({ ...current, minute: Number(event.target.value) }))}
          />
        </label>
      ) : null}
      {draft.mode === "daily" || draft.mode === "weekdays" || draft.mode === "weekly" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Hour</span>
            <input
              className="field"
              type="number"
              min={0}
              max={23}
              value={draft.hour}
              onChange={(event) => setDraft((current) => ({ ...current, hour: Number(event.target.value) }))}
            />
          </label>
          <label className="block">
            <span className="field-label">Minute</span>
            <input
              className="field"
              type="number"
              min={0}
              max={59}
              value={draft.minute}
              onChange={(event) => setDraft((current) => ({ ...current, minute: Number(event.target.value) }))}
            />
          </label>
        </div>
      ) : null}
      {draft.mode === "weekly" ? (
        <label className="block">
          <span className="field-label">Weekday (0=Sun)</span>
          <input
            className="field"
            type="number"
            min={0}
            max={6}
            value={draft.weekday}
            onChange={(event) => setDraft((current) => ({ ...current, weekday: Number(event.target.value) }))}
          />
        </label>
      ) : null}
      {draft.mode === "custom" ? (
        <label className="block">
          <span className="field-label">Expression</span>
          <input
            className="field mono"
            value={draft.raw}
            onChange={(event) => setDraft((current) => ({ ...current, raw: event.target.value }))}
            autoComplete="off"
          />
        </label>
      ) : null}
      <p className="mono text-xs text-ink-dim">{value}</p>
      <p className="text-xs text-ink-dim">{CRON_PRESETS.map((preset) => preset.label).join(" · ")}</p>
    </div>
  );
}
