"use client";

import { useState } from "react";
import { API_SCOPES, API_SCOPE_LABELS, DEFAULT_API_SCOPES, resolveStoredScopes } from "@/lib/api-scopes";

type Token = {
  id: string;
  name: string;
  prefix: string;
  scopes?: string;
  expiresAt?: Date | string | null;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
};

function formatWhen(value: Date | string | null | undefined) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

export function ApiTokensPanel({ tokens, canEdit }: { tokens: Token[]; canEdit: boolean }) {
  const [rows, setRows] = useState(tokens);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setStatus(null);
    const response = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        scopes: data.getAll("scopes").map(String),
        expiresInDays: String(data.get("expiresInDays") ?? ""),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Could not create token");
      return;
    }
    setRows((current) => [payload.token, ...current]);
    setRevealed(payload.raw);
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
        Bearer tokens for <span className="mono">/api/v1</span>. The secret is shown once. Full reference lives in{" "}
        <a className="text-gold" href="/settings#docs">
          Docs
        </a>
        .
      </p>
      {canEdit ? (
        <form className="mt-5 space-y-4" onSubmit={create}>
          <div className="flex flex-wrap gap-2">
            <input className="field max-w-xs" name="name" placeholder="Deploy token" required minLength={2} />
            <select className="field max-w-[10rem]" name="expiresInDays" defaultValue="">
              <option value="">No expiry</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
            <button className="btn btn-gold" type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create token"}
            </button>
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-xs uppercase tracking-[0.16em] text-ink-dim">Scopes</legend>
            {API_SCOPES.map((scope) => (
              <label key={scope} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  defaultChecked={DEFAULT_API_SCOPES.includes(scope)}
                />
                <span>
                  <span className="mono text-xs">{scope}</span>
                  <span className="mt-0.5 block text-ink-dim">{API_SCOPE_LABELS[scope].hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
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
                <p className="mt-1 text-xs text-ink-dim">
                  {resolveStoredScopes(token.scopes).join(", ")}
                </p>
                <p className="text-xs text-ink-dim">
                  Last used {formatWhen(token.lastUsedAt)}
                  {token.expiresAt ? ` · expires ${formatWhen(token.expiresAt)}` : " · no expiry"}
                </p>
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
