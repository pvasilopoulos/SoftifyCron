"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export function JobMenu({
  jobId,
  keepResponse,
  canManage,
}: {
  jobId: string;
  keepResponse: boolean;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
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
          className="absolute right-0 z-40 mt-2 min-w-44 rounded-2xl border border-line bg-bg-elev p-2 shadow-lg"
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
          {canManage ? (
            <Link
              href={`/jobs/${jobId}/edit`}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm hover:bg-bg-mute"
              onClick={() => setOpen(false)}
            >
              Edit
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
