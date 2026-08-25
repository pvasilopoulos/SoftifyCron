"use client";

import { useState } from "react";
import { TIMEZONES } from "@/lib/format";

export function SettingsForm({
  name,
  timezone,
  notifyEmail,
  canEdit,
}: {
  name: string;
  timezone: string;
  notifyEmail: string;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tenant", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        timezone: String(form.get("timezone") ?? ""),
        notifyEmail: String(form.get("notifyEmail") ?? ""),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    setStatus(response.ok ? "Saved" : data.error ?? "Save failed");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="field-label">Workspace name</span>
        <input className="field" name="name" defaultValue={name} disabled={!canEdit} required />
      </label>
      <label className="block">
        <span className="field-label">Default timezone</span>
        <select className="field" name="timezone" defaultValue={timezone} disabled={!canEdit}>
          {TIMEZONES.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Alert email</span>
        <input
          className="field"
          type="email"
          name="notifyEmail"
          defaultValue={notifyEmail}
          disabled={!canEdit}
          placeholder="ops@example.com"
        />
      </label>
      <p className="text-xs text-ink-dim">
        Optional. Used when a job fails or auto-pauses. SMTP must be configured on the server.
      </p>
      {canEdit ? (
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save workspace"}
        </button>
      ) : (
        <p className="text-sm text-ink-dim">You do not have permission to edit workspace settings.</p>
      )}
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
