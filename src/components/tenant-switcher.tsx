"use client";

import { useEffect, useRef, useState } from "react";
import { exitCustomerAction, switchWorkspaceAction } from "@/app/actions/admin";

export type WorkspaceChoice = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export function TenantSwitcher({
  currentId,
  currentName,
  currentSlug,
  workspaces,
  platform = false,
  compact = false,
}: {
  currentId: string;
  currentName: string;
  currentSlug: string;
  workspaces: WorkspaceChoice[];
  platform?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canSwitch = platform || workspaces.length > 1;

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

  if (!canSwitch) {
    return (
      <div className={compact ? "" : "mt-5 min-w-0"}>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-dim">{currentSlug}</p>
        {!compact ? <p className="mt-1 truncate font-display text-xl text-ink">{currentName}</p> : null}
      </div>
    );
  }

  return (
    <div className={`relative ${compact ? "" : "mt-5"}`} ref={root}>
      <button
        type="button"
        className={compact ? "max-w-[10rem] truncate text-left text-xs text-ink-dim" : "rail-switch"}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {compact ? (
          currentName
        ) : (
          <>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-dim">{currentSlug}</span>
              <span className="mt-0.5 block truncate font-display text-xl text-ink">{currentName}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 9l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
      {open ? (
        <div className={`rail-menu${compact ? " is-compact" : ""}`} role="listbox" aria-label="Switch tenant">
          {platform ? (
            <form action={exitCustomerAction}>
              <button type="submit" className="rail-menu-item">
                <span>All tenants</span>
                <span className="hint">Platform</span>
              </button>
            </form>
          ) : null}
          {workspaces.map((workspace) => (
            <form key={workspace.id} action={switchWorkspaceAction}>
              <input type="hidden" name="tenantId" value={workspace.id} />
              <button
                type="submit"
                role="option"
                aria-selected={workspace.id === currentId}
                className={`rail-menu-item${workspace.id === currentId ? " is-on" : ""}`}
              >
                <span>{workspace.name}</span>
                <span className="hint">{workspace.slug}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
