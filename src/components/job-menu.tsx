"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const labelId = useId();

  function placeMenu() {
    const el = trigger.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 216;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setCoords({ top: rect.bottom + 6, left });
  }

  useEffect(() => {
    if (!open) return;
    placeMenu();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (root.current?.contains(target) || menu.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      placeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
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
    <div className="relative shrink-0" ref={root}>
      <button
        ref={trigger}
        className="menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          placeMenu();
          setOpen(true);
        }}
      >
        <span id={labelId} className="sr-only">
          Job menu
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="2.35" />
          <circle cx="12" cy="12" r="2.35" />
          <circle cx="12" cy="19" r="2.35" />
        </svg>
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={menu}
              role="menu"
              className="menu-pop is-fixed"
              style={{ top: coords.top, left: coords.left }}
            >
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
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await snoozeJobRequest(jobId, 1);
                    toast("Snoozed for 1 hour");
                  })
                }
              >
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 8v4.2l2.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Icon>
                Snooze 1 hour
              </Item>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await snoozeJobRequest(jobId, 8);
                    toast("Snoozed for 8 hours");
                  })
                }
              >
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 8v4.2l2.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Icon>
                Snooze 8 hours
              </Item>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await snoozeJobRequest(jobId, 24);
                    toast("Snoozed for 24 hours");
                  })
                }
              >
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 8v4.2l2.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Icon>
                Snooze 24 hours
              </Item>
              <Item
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await snoozeJobRequest(jobId, 0);
                    toast("Snooze cleared");
                  })
                }
              >
                <Icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Icon>
                Clear snooze
              </Item>
            </>
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
