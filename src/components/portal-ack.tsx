"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/toaster";

export function PortalAck({ jobId, jobName }: { jobId: string; jobName: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function ack() {
    setPending(true);
    const response = await fetch(`/api/portal/jobs/${jobId}/ack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setPending(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? "Could not acknowledge", "err");
      return;
    }
    toast(`Acknowledged ${jobName}`);
    setNote("");
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <input
        className="field min-w-[12rem] flex-1"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="I saw it — optional note"
        maxLength={500}
      />
      <button className="btn btn-gold" type="button" disabled={pending} onClick={() => void ack()}>
        {pending ? "Saving…" : "I saw it"}
      </button>
    </div>
  );
}
