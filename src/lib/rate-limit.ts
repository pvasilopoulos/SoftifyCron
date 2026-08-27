export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key) ?? [];
  const fresh = bucket.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

const buckets = new Map<string, number[]>();

export function resetRateLimitForTests() {
  buckets.clear();
}
