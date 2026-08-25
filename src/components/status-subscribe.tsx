"use client";

import { useState } from "react";

export function StatusSubscribe({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="card mt-8 p-5 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setStatus(null);
        const response = await fetch(`/api/status/${encodeURIComponent(slug)}/subscribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json().catch(() => ({}));
        setPending(false);
        if (!response.ok) {
          setStatus(typeof data.error === "string" ? data.error : "Could not subscribe");
          return;
        }
        setEmail("");
        setStatus("Check your email to confirm alerts.");
      }}
    >
      <h2 className="font-display text-2xl">Email alerts</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Confirm once, then get a daily mail while jobs on this page need attention.
      </p>
      <label className="mt-4 block">
        <span className="field-label">Email</span>
        <input
          className="field"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <button className="btn btn-gold mt-4" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Subscribe"}
      </button>
      {status ? <p className="mt-3 text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
