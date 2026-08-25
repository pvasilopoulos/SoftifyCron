import type { RunStatus } from "@prisma/client";

export function StatusPill({ status }: { status: RunStatus | string }) {
  const key = String(status).toLowerCase();
  return (
    <span className={`status-pill status-${key}`}>
      <i />
      {key}
    </span>
  );
}
