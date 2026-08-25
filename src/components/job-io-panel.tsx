"use client";

import { useState } from "react";

export function JobIoPanel({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<string | null>(null);

  async function download(path: string, filename: string) {
    const response = await fetch(path);
    if (!response.ok) {
      setStatus("Export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  }

  async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const response = await fetch("/api/jobs/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: text,
    });
    const data = await response.json().catch(() => ({}));
    setStatus(response.ok ? `Imported ${data.count ?? 0} jobs (paused)` : data.error ?? "Import failed");
    event.target.value = "";
  }

  return (
    <section className="card p-6">
      <h2 className="font-display text-2xl">Backup</h2>
      <p className="mt-2 text-sm text-ink-dim">
        JSON export of jobs and groups. Secrets values are not included. Imported jobs stay paused.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => void download("/api/jobs/export", "softifycron-jobs.json")}
        >
          Export jobs
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => void download("/api/backup", "softifycron-backup.json")}
        >
          Export workspace
        </button>
        {canEdit ? (
          <label className="btn btn-gold">
            Import JSON
            <input className="hidden" type="file" accept="application/json" onChange={importFile} />
          </label>
        ) : null}
      </div>
      {status ? <p className="mt-3 text-sm text-ink-dim">{status}</p> : null}
    </section>
  );
}
