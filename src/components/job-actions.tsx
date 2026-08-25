"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function JobActions({
  jobId,
  enabled,
  canManage,
  keepResponse,
}: {
  jobId: string;
  enabled: boolean;
  canManage: boolean;
  keepResponse: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runNow() {
    setBusy("run");
    setMessage(null);
    const response = await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Run failed");
      return;
    }
    setMessage(`Finished with ${String(data.status).toLowerCase()}`);
    router.refresh();
  }

  async function toggle() {
    setBusy("toggle");
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setBusy(null);
    router.refresh();
  }

  async function duplicate() {
    setBusy("copy");
    const response = await fetch(`/api/jobs/${jobId}/duplicate`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setMessage(data.error ?? "Could not duplicate");
      return;
    }
    router.push(`/jobs/${data.job.id}/edit`);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this job and its run history?")) return;
    setBusy("delete");
    const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) return;
    router.push("/jobs");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn btn-gold" type="button" onClick={runNow} disabled={!!busy}>
        {busy === "run" ? "Running…" : "Run now"}
      </button>
      {keepResponse ? (
        <Link href={`/jobs/${jobId}/response`} className="btn btn-ghost">
          View response
        </Link>
      ) : null}
      {canManage ? (
        <>
          <button className="btn btn-ghost" type="button" onClick={toggle} disabled={!!busy}>
            {enabled ? "Pause" : "Resume"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={duplicate} disabled={!!busy}>
            {busy === "copy" ? "Copying…" : "Duplicate"}
          </button>
          <button className="btn btn-danger" type="button" onClick={remove} disabled={!!busy}>
            Delete
          </button>
        </>
      ) : null}
      {message ? <span className="text-sm text-ink-dim">{message}</span> : null}
    </div>
  );
}
