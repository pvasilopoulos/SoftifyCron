"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { commentRunRequest } from "@/lib/job-client";
import { toast } from "@/components/toaster";

export function RunCommentForm({ runId, initial }: { runId: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await commentRunRequest(runId, value);
      toast("Comment saved");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save comment", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={save}>
      <label className="block">
        <span className="field-label">Run comment</span>
        <textarea
          className="field min-h-20"
          maxLength={500}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="What changed, who was paged, why this run is noisy…"
        />
      </label>
      <button className="btn btn-ghost" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save comment"}
      </button>
    </form>
  );
}
