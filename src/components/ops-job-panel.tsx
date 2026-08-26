"use client";

import { useState } from "react";
import { toast } from "@/components/toaster";

export function OpsJobPanel({
  jobId,
  assigneeEmail,
  hasGolden,
  canEdit,
}: {
  jobId: string;
  assigneeEmail: string;
  hasGolden: boolean;
  canEdit: boolean;
}) {
  const [email, setEmail] = useState(assigneeEmail);
  const [libraryName, setLibraryName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(`/api/jobs/${jobId}/ops`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      const text = data.error ?? "Failed";
      setStatus(text);
      toast(text, "err");
      return;
    }
    setStatus("Saved");
    toast("Saved");
  }

  if (!canEdit) {
    return assigneeEmail ? <p className="text-sm text-ink-dim">Assignee {assigneeEmail}</p> : null;
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="field-label">Assignee</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ops@example.com" />
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void post({ email })}>
            Assign
          </button>
        </div>
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => void post({ golden: true })}>
          {hasGolden ? "Re-pin golden body" : "Pin last success as golden"}
        </button>
      </div>
      <label className="block">
        <span className="field-label">Save to template library</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input className="field" value={libraryName} onChange={(event) => setLibraryName(event.target.value)} placeholder="Name" />
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void post({ libraryName })}>
            Save template
          </button>
        </div>
      </label>
      {status ? <p className="text-ink-dim">{status}</p> : null}
    </div>
  );
}
