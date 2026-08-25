"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  confirmDeleteJob,
  deleteJobRequest,
  duplicateJobRequest,
  runJobRequest,
  skipJobRequest,
  snoozeJobRequest,
  toggleJobRequest,
} from "@/lib/job-client";
import { toast } from "@/components/toaster";
import type { JobAccess } from "@/lib/acl";

export function JobActions({
  jobId,
  name,
  enabled,
  access,
  keepResponse,
  responseBoard = false,
  curl,
}: {
  jobId: string;
  name: string;
  enabled: boolean;
  access: JobAccess;
  keepResponse: boolean;
  responseBoard?: boolean;
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
      const text = error instanceof Error ? error.message : "Action failed";
      setMessage(text);
      toast(text, "err");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {access.run ? (
        <button
          className="btn btn-gold"
          type="button"
          disabled={!!busy}
          onClick={() =>
            wrap("run", async () => {
              const data = await runJobRequest(jobId);
              setMessage(`Finished with ${String(data.status).toLowerCase()}`);
              toast(`Finished with ${String(data.status).toLowerCase()}`);
              router.refresh();
            })
          }
        >
          {busy === "run" ? "Running…" : "Run now"}
        </button>
      ) : null}
      {access.edit && enabled ? (
        <button
          className="btn btn-ghost"
          type="button"
          disabled={!!busy}
          onClick={() =>
            wrap("skip", async () => {
              await skipJobRequest(jobId);
              setMessage("Skipped next fire");
              toast("Skipped next fire");
              router.refresh();
            })
          }
        >
          {busy === "skip" ? "Skipping…" : "Skip next"}
        </button>
      ) : null}
      {access.edit ? (
        <label className="inline-flex items-center gap-2 text-sm">
          <span className="sr-only">Snooze</span>
          <select
            className="field w-auto min-w-36"
            disabled={!!busy}
            defaultValue=""
            onChange={(event) => {
              const hours = Number(event.target.value);
              event.currentTarget.value = "";
              if (!Number.isFinite(hours)) return;
              wrap("snooze", async () => {
                await snoozeJobRequest(jobId, hours);
                setMessage(hours ? `Snoozed for ${hours}h` : "Snooze cleared");
                toast(hours ? `Snoozed for ${hours}h` : "Snooze cleared");
                router.refresh();
              });
            }}
          >
            <option value="" disabled>
              Snooze…
            </option>
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="8">8 hours</option>
            <option value="24">24 hours</option>
            <option value="0">Clear snooze</option>
          </select>
        </label>
      ) : null}
      {keepResponse ? (
        <Link
          href={responseBoard ? `/responses?job=${jobId}` : `/jobs/${jobId}/response`}
          className="btn btn-ghost"
        >
          {responseBoard ? "Response board" : "View response"}
        </Link>
      ) : null}
      {curl ? (
        <button
          className="btn btn-ghost"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(curl);
            setMessage("Copied curl");
            toast("Copied curl");
          }}
        >
          Copy curl
        </button>
      ) : null}
      {access.edit ? (
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
        </>
      ) : null}
      {access.delete ? (
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
      ) : null}
      {message ? <span className="text-sm text-ink-dim">{message}</span> : null}
    </div>
  );
}
