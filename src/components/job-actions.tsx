"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ackJobRequest,
  confirmDeleteJob,
  deleteJobRequest,
  duplicateJobRequest,
  muteJobRequest,
  previewJobRequest,
  runJobRequest,
  skipJobRequest,
  snoozeJobRequest,
  scheduleOnceRequest,
  toggleJobRequest,
} from "@/lib/job-client";
import { toast } from "@/components/toaster";
import type { JobAccess } from "@/lib/acl";

export function JobActions({
  jobId,
  name,
  enabled,
  access,
  curl,
  lastStatus,
  onceAt,
  editHref,
}: {
  jobId: string;
  name: string;
  enabled: boolean;
  access: JobAccess;
  curl?: string;
  lastStatus?: string | null;
  onceAt?: string | Date | null;
  editHref?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [onceValue, setOnceValue] = useState("");

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

  const canRun = access.run;
  const canEdit = access.edit;
  const showManage = Boolean(editHref || curl || canEdit || access.delete);
  if (!canRun && !canEdit && !showManage) return null;

  return (
    <section className="job-action-panel">
      {canRun ? (
        <div className="job-action-group">
          <p className="job-action-kicker">Run</p>
          <div className="job-action-grid">
            <button
              className="btn btn-gold job-action-span"
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
            <button
              className="btn btn-ghost"
              type="button"
              disabled={!!busy}
              onClick={() =>
                wrap("silent", async () => {
                  const data = await runJobRequest(jobId, { silent: true });
                  setMessage(`Silent ${String(data.status).toLowerCase()}`);
                  toast(`Silent ${String(data.status).toLowerCase()}`);
                  router.refresh();
                })
              }
            >
              {busy === "silent" ? "Running…" : "Silent"}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={!!busy}
              onClick={() =>
                wrap("preview", async () => {
                  const data = await previewJobRequest(jobId);
                  const text = data.ok
                    ? `Dry-run HTTP ${data.httpStatus} in ${data.durationMs}ms`
                    : `Dry-run failed: ${data.error ?? "error"}`;
                  setMessage(text);
                  toast(text, data.ok ? "ok" : "err");
                  if (data.responseBody) {
                    console.info("[softifycron preview]", data.responseBody);
                  }
                })
              }
            >
              {busy === "preview" ? "Preview…" : "Dry-run"}
            </button>
            {lastStatus && lastStatus !== "SUCCESS" ? (
              <button
                className="btn btn-ghost job-action-span"
                type="button"
                disabled={!!busy}
                onClick={() =>
                  wrap("ack", async () => {
                    const note = prompt("Ack note (optional)") ?? "";
                    await ackJobRequest(jobId, note);
                    setMessage("Acknowledged");
                    toast("Acknowledged");
                    router.refresh();
                  })
                }
              >
                Ack this failure
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="job-action-group">
          <p className="job-action-kicker">Timing</p>
          <div className="job-action-grid">
            <select
              className="field job-action-field"
              disabled={!!busy}
              defaultValue=""
              aria-label="Mute event"
              onChange={(event) => {
                const value = event.target.value;
                event.currentTarget.value = "";
                if (!value) return;
                const [eventName, hours] = value.split(":");
                wrap("mute", async () => {
                  await muteJobRequest(jobId, eventName, Number(hours));
                  setMessage(Number(hours) ? `Muted ${eventName} for ${hours}h` : `Cleared ${eventName} mute`);
                  toast(Number(hours) ? `Muted ${eventName} for ${hours}h` : `Cleared ${eventName} mute`);
                  router.refresh();
                });
              }}
            >
              <option value="" disabled>
                Mute event…
              </option>
              <option value="slow:8">Mute slow 8h</option>
              <option value="failure:8">Mute fails 8h</option>
              <option value="missed:8">Mute missed 8h</option>
              <option value="slow:0">Clear slow mute</option>
              <option value="failure:0">Clear fail mute</option>
              <option value="missed:0">Clear missed mute</option>
            </select>
            <select
              className="field job-action-field"
              disabled={!!busy}
              defaultValue=""
              aria-label="Snooze"
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
            <input
              className="field job-action-field job-action-span"
              type="datetime-local"
              value={onceValue}
              disabled={!!busy}
              aria-label="Fire once at"
              onChange={(event) => setOnceValue(event.target.value)}
            />
            <button
              className={enabled ? "btn btn-ghost" : "btn btn-ghost job-action-span"}
              type="button"
              disabled={!!busy || !onceValue}
              onClick={() =>
                wrap("once", async () => {
                  await scheduleOnceRequest(jobId, new Date(onceValue).toISOString());
                  setOnceValue("");
                  setMessage("Once-off scheduled");
                  toast("Once-off scheduled");
                  router.refresh();
                })
              }
            >
              {busy === "once" ? "Saving…" : "Fire once"}
            </button>
            {enabled ? (
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
            {onceAt ? (
              <button
                className="btn btn-ghost job-action-span"
                type="button"
                disabled={!!busy}
                onClick={() =>
                  wrap("once-clear", async () => {
                    await scheduleOnceRequest(jobId, null);
                    setMessage("Once-off cleared");
                    toast("Once-off cleared");
                    router.refresh();
                  })
                }
              >
                Clear once-off
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showManage ? (
        <div className="job-action-group">
          <p className="job-action-kicker">Job</p>
          <div className="job-action-grid">
            {editHref ? (
              <Link href={editHref} className="btn btn-ghost">
                Edit
              </Link>
            ) : null}
            {canEdit ? (
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
            ) : null}
            {canEdit ? (
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
            {access.delete ? (
              <button
                className="btn btn-danger job-action-span"
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
          </div>
        </div>
      ) : null}
      {message ? <p className="text-sm text-ink-dim">{message}</p> : null}
    </section>
  );
}
