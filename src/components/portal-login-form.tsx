"use client";

import { useState } from "react";

export function PortalLoginForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const response = await fetch("/api/portal/magic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Could not send link");
      return;
    }
    setStatus("If that mailbox belongs to a client portal, we sent a 24-hour link.");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="field-label">Email</span>
        <input className="field" type="email" name="email" required maxLength={160} autoComplete="email" />
      </label>
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
      <p className="text-xs text-ink-dim">
        Durable links look like <span className="mono">/portal/pt_…</span>. Opening one stores a cookie and
        moves you to a clean /portal URL.
      </p>
    </form>
  );
}
