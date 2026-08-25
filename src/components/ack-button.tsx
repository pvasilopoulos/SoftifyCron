"use client";

import { useRouter } from "next/navigation";
import { ackJobRequest } from "@/lib/job-client";
import { toast } from "@/components/toaster";

export function AckButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost btn-sm"
      type="button"
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          const note = prompt("Ack note (optional)") ?? "";
          await ackJobRequest(jobId, note);
          toast("Acknowledged");
          router.refresh();
        } catch (error) {
          toast(error instanceof Error ? error.message : "Ack failed", "err");
        }
      }}
    >
      Ack
    </button>
  );
}
