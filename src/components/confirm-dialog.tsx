"use client";

import { useEffect } from "react";

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  pending = false,
  onCancel,
  children,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="palette-backdrop" onClick={() => (pending ? null : onCancel())}>
      <div
        className="palette max-w-md p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-display text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-dim">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          {children ?? (
            <button className="btn btn-danger" type="button" disabled={pending}>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
