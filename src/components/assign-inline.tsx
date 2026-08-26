"use client";

import { useState } from "react";

export function AssignInline({ jobId, email }: { jobId: string; email: string }) {
  const [value, setValue] = useState(email);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void fetch(`/api/jobs/${jobId}/ops`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: value }),
        }).then((response) => {
          setStatus(response.ok ? "Assigned" : "Failed");
        });
      }}
    >
      <input
        className="field w-40"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="assignee@"
        aria-label="Assignee"
      />
      <button className="btn btn-ghost btn-sm" type="submit">
        Assign
      </button>
      {status ? <span className="text-xs text-ink-dim">{status}</span> : null}
    </form>
  );
}
