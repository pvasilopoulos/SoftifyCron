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
import type { JobAccess } from "@/lib/acl";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="menu-ico" aria-hidden>
      {children}
    </span>
  );
}

function Item({
  children,
  onClick,
  disabled,
  danger,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  href?: string;
}) {
  const className = `menu-item${danger ? " is-danger" : ""}`;
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function JobMenu({
  jobId,
  name,
  enabled,
  keepResponse,
  responseBoard = false,
  access,
}: {
  jobId: string;
  name: string;
  enabled: boolean;
  keepResponse: boolean;
  responseBoard?: boolean;
  access: JobAccess;
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
    <div className="relative text-left" ref={root}>
      <button
        className="menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span id={labelId} className="sr-only">
          Job menu
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className="menu-pop">
          <Item href={`/jobs/${jobId}`} onClick={() => setOpen(false)}>
            <Icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Icon>
            Open
          </Item>
          {keepResponse ? (
            <Item
              href={responseBoard ? `/responses?job=${jobId}` : `/jobs/${jobId}/response`}
              onClick={() => setOpen(false)}
            >
              <Icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Icon>
              {responseBoard ? "Response board" : "View response"}
            </Item>
          ) : null}
          {access.run ? (
            <Item
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await runJobRequest(jobId);
                  toast("Run finished");
                })
              }
            >
              <Icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 6.5v11l10-5.5-10-5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </Icon>
              Run now
            </Item>
          ) : null}
          {access.edit && enabled ? (
            <Item
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await skipJobRequest(jobId);
                  toast("Skipped next fire");
                })
              }
            >
              <Icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 7v10M11 7l8 5-8 5V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Icon>
              Skip next
            </Item>
          ) : null}
          {access.edit ? (
            <>
              <div className="menu-sep" />
              <Item href={`/jobs/${jobId}/edit`} onClick={() => setOpen(false)}>
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </Icon>
                Edit
              </Item>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await toggleJobRequest(jobId, !enabled);
                  })
                }
              >
                <Icon>
                  {enabled ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="7" y="6" width="3.2" height="12" rx="1" fill="currentColor" />
                      <rect x="13.8" y="6" width="3.2" height="12" rx="1" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M8 6.5v11l10-5.5-10-5.5Z" fill="currentColor" />
                    </svg>
                  )}
                </Icon>
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
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M6 16V7a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Icon>
                Duplicate
              </Item>
            </>
          ) : null}
          {access.delete ? (
            <>
              <div className="menu-sep" />
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
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Icon>
                Delete job
              </Item>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
