"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  confirmDeleteJob,
  deleteJobRequest,
  duplicateJobRequest,
  runJobRequest,
  toggleJobRequest,
} from "@/lib/job-client";

export function JobActions({
  jobId,
  name,
  enabled,
  canManage,
  keepResponse,
  curl,
}: {
  jobId: string;
  name: string;
  enabled: boolean;
  canManage: boolean;
  keepResponse: boolean;
  curl?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function wrap(key: string, action: () => Promise<void>) {
    setBusy(key);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="btn btn-gold"
        type="button"
        disabled={!!busy}
        onClick={() =>
          wrap("run", async () => {
            const data = await runJobRequest(jobId);
            setMessage(`Finished with ${String(data.status).toLowerCase()}`);
            router.refresh();
          })
        }
      >
        {busy === "run" ? "Running…" : "Run now"}
      </button>
      {keepResponse ? (
        <Link href={`/jobs/${jobId}/response`} className="btn btn-ghost">
          View response
        </Link>
      ) : null}
      {curl ? (
        <button
          className="btn btn-ghost"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(curl);
            setMessage("Copied curl");
          }}
        >
          Copy curl
        </button>
      ) : null}
      {canManage ? (
        <>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={!!busy}
            onClick={() =>
              wrap("toggle", async () => {
                await toggleJobRequest(jobId, !enabled);
                router.refresh();
              })
            }
          >
            {enabled ? "Pause" : "Resume"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={!!busy}
            onClick={() =>
              wrap("copy", async () => {
                const data = await duplicateJobRequest(jobId);
                router.push(`/jobs/${data.job.id}/edit`);
                router.refresh();
              })
            }
          >
            {busy === "copy" ? "Copying…" : "Duplicate"}
          </button>
          <button
            className="btn btn-danger"
            type="button"
            disabled={!!busy}
            onClick={() =>
              wrap("delete", async () => {
                if (!confirmDeleteJob(name)) return;
                await deleteJobRequest(jobId);
                router.push("/jobs");
                router.refresh();
              })
            }
          >
            Delete job
          </button>
        </>
      ) : null}
      {message ? <span className="text-sm text-ink-dim">{message}</span> : null}
    </div>
  );
}
