/** Plesk cron is every minute; stale after two missed ticks. */
export const HEARTBEAT_STALE_MS = 135_000;

export function heartbeatStatus(tickedAt: Date | string | null | undefined, now = Date.now()) {
  if (!tickedAt) {
    return { stale: true, ageMs: null as number | null, label: "Never ticked" };
  }
  const at = typeof tickedAt === "string" ? new Date(tickedAt).getTime() : tickedAt.getTime();
  const ageMs = now - at;
  const stale = ageMs > HEARTBEAT_STALE_MS;
  return { stale, ageMs, label: stale ? "Worker is stale" : "Worker is healthy" };
}
