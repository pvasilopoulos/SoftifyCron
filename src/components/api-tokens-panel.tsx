"use client";

import { useState } from "react";

type Token = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
};

export function ApiTokensPanel({ tokens, canEdit }: { tokens: Token[]; canEdit: boolean }) {
  const [rows, setRows] = useState(tokens);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setStatus(null);
    const response = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: String(new FormData(form).get("name") ?? "") }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(data.error ?? "Could not create token");
      return;
    }
    setRows((current) => [data.token, ...current]);
    setRevealed(data.raw);
    form.reset();
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <section className="card p-6">
      <h2 className="font-display text-2xl">API tokens</h2>
      <p className="mt-2 text-sm text-ink-dim">
        Bearer tokens for <span className="mono">/api/v1/jobs</span>. Shown once at creation.
      </p>
      {canEdit ? (
        <form className="mt-5 flex flex-wrap gap-2" onSubmit={create}>
          <input className="field max-w-xs" name="name" placeholder="Deploy token" required minLength={2} />
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create token"}
          </button>
        </form>
      ) : null}
      {revealed ? (
        <p className="mono mt-4 break-all rounded-2xl bg-bg p-3 text-sm">{revealed}</p>
      ) : null}
      {status ? <p className="mt-3 text-sm text-rose">{status}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-ink-dim">No tokens yet.</li>
        ) : (
          rows.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <p className="font-medium">{token.name}</p>
                <p className="mono text-xs text-ink-dim">{token.prefix}…</p>
              </div>
              {canEdit ? (
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => void revoke(token.id)}>
                  Revoke
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
