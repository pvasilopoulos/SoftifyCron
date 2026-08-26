"use client";

import { useState } from "react";

export function JobHookCard({
  jobId,
  prefix,
  canEdit,
}: {
  jobId: string;
  prefix: string | null;
  canEdit: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [shownPrefix, setShownPrefix] = useState(prefix);
  const [status, setStatus] = useState<string | null>(null);

  async function rotate() {
    const response = await fetch(`/api/jobs/${jobId}/hook`, { method: "POST" });
    const data = (await response.json()) as { url?: string; prefix?: string; error?: string };
    if (!response.ok) {
      setStatus(data.error ?? "Could not create hook");
      return;
    }
    setUrl(data.url ?? null);
    setShownPrefix(data.prefix ?? null);
    setStatus("Copy this URL now. It is shown once.");
  }

  async function clear() {
    const response = await fetch(`/api/jobs/${jobId}/hook`, { method: "DELETE" });
    if (!response.ok) {
      setStatus("Could not disable hook");
      return;
    }
    setUrl(null);
    setShownPrefix(null);
    setStatus("Inbound hook disabled");
  }

  return (
    <section className="card p-5">
      <h2 className="font-display text-2xl">Inbound hook</h2>
      <p className="mt-1 text-sm text-ink-dim">
        POST or GET this URL (GitHub, deploy, another app) to fire the job now. No session cookie required.
      </p>
      {shownPrefix ? <p className="mt-3 mono text-xs text-ink-dim">Active token {shownPrefix}…</p> : null}
      {url ? (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <p className="break-all mono text-sm text-gold">{url}</p>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(url);
              setStatus("Copied");
            }}
          >
            Copy
          </button>
        </div>
      ) : null}
      {status ? <p className="mt-2 text-sm text-ink-dim">{status}</p> : null}
      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-gold btn-sm" type="button" onClick={() => void rotate()}>
            {shownPrefix ? "Rotate token" : "Create hook"}
          </button>
          {shownPrefix ? (
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void clear()}>
              Disable
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
