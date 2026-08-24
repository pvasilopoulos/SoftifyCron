import type { RunStatus } from "@prisma/client";

const STYLES: Record<RunStatus, string> = {
  PENDING: "bg-line/40 text-ink-dim",
  RUNNING: "bg-gold/15 text-gold-2",
  SUCCESS: "bg-sage/15 text-sage",
  FAILED: "bg-rose/15 text-rose",
  TIMEOUT: "bg-rose/10 text-rose",
  BLOCKED: "bg-rose/10 text-rose",
};

export function StatusPill({ status }: { status: RunStatus | string }) {
  const cls = STYLES[status as RunStatus] ?? "bg-line/40 text-ink-dim";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
