const FAILING = new Set(["FAILED", "TIMEOUT", "BLOCKED"]);

export function isFailingStatus(status: string | null | undefined) {
  return Boolean(status && FAILING.has(status));
}

export function incidentDurationMs(openedAt: Date | string, closedAt?: Date | string | null, now = new Date()) {
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : now.getTime();
  return Math.max(0, end - start);
}
