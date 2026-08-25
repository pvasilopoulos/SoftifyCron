"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  confirmDeleteJob,
  deleteJobRequest,
  duplicateJobRequest,
  runJobRequest,
  skipJobRequest,
  toggleJobRequest,
} from "@/lib/job-client";
import { toast } from "@/components/toaster";

function Item({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-bg-mute disabled:opacity-50 ${
        danger ? "text-rose" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function JobMenu({
  jobId,
  name,
  enabled,
  keepResponse,
  canManage,
}: {
  jobId: string;
  name: string;
  enabled: boolean;
  keepResponse: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={root}>
      <button
        className="btn btn-ghost min-h-10 px-3"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span id={labelId}>Menu</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 min-w-48 rounded-2xl border border-line bg-bg-elev p-2 shadow-lg"
        >
          <Link
            href={`/jobs/${jobId}`}
            role="menuitem"
            className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
            onClick={() => setOpen(false)}
          >
            Open
          </Link>
          {keepResponse ? (
            <Link
              href={`/jobs/${jobId}/response`}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
              onClick={() => setOpen(false)}
            >
              View response
            </Link>
          ) : null}
          <Item disabled={busy} onClick={() => run(async () => { await runJobRequest(jobId); toast("Run finished"); })}>
            Run now
          </Item>
          {canManage && enabled ? (
            <Item
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await skipJobRequest(jobId);
                  toast("Skipped next fire");
                })
              }
            >
              Skip next
            </Item>
          ) : null}
          {canManage ? (
            <>
              <div className="my-1 border-t border-line" />
              <Link
                href={`/jobs/${jobId}/edit`}
                role="menuitem"
                className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
                onClick={() => setOpen(false)}
              >
                Edit
              </Link>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await toggleJobRequest(jobId, !enabled);
                  })
                }
              >
                {enabled ? "Pause" : "Resume"}
              </Item>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const data = await duplicateJobRequest(jobId);
                    router.push(`/jobs/${data.job.id}/edit`);
                  })
                }
              >
                Duplicate
              </Item>
              <div className="my-1 border-t border-line" />
              <Item
                danger
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!confirmDeleteJob(name)) return;
                    await deleteJobRequest(jobId);
                  })
                }
              >
                Delete job
              </Item>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
