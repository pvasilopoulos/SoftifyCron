"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreRevisionRequest } from "@/lib/job-client";
import { toast } from "@/components/toaster";

export type JobRevisionRow = {
  id: string;
  actor: string;
  createdAt: string;
  name: string;
};

export function JobHistory({
  jobId,
  revisions,
  canRestore,
  timeZone,
}: {
  jobId: string;
  revisions: JobRevisionRow[];
  canRestore: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (revisions.length === 0) return null;

  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="font-display text-2xl">Version history</h2>
        <p className="mt-1 text-sm text-ink-dim">Snapshots taken when the job is saved. Restore puts that config back.</p>
      </div>
      <ul className="divide-y divide-line">
        {revisions.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="font-medium">{row.name || "Job"}</p>
              <p className="mt-1 text-xs text-ink-dim">
                {new Date(row.createdAt).toLocaleString(undefined, { timeZone })}
                {row.actor ? ` · ${row.actor}` : ""}
              </p>
            </div>
            {canRestore ? (
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={!!busy}
                onClick={async () => {
                  if (!confirm("Restore this version? The current config is saved first.")) return;
                  setBusy(row.id);
                  try {
                    await restoreRevisionRequest(jobId, row.id);
                    toast("Restored");
                    router.refresh();
                  } catch (error) {
                    toast(error instanceof Error ? error.message : "Could not restore", "err");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === row.id ? "Restoring…" : "Restore"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
