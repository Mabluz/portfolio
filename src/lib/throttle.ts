/**
 * In-memory counter per key within a time window. Used for the login limit and for the API
 * (failed keys per IP, requests per key). Per process: it resets on restart, which is fine for
 * a single container.
 */
export function createThrottle(max: number, windowMs: number, pruneAt = 1000) {
  const entries = new Map<string, { count: number; resetAt: number }>();

  function isThrottled(key: string, now = Date.now()) {
    const entry = entries.get(key);
    if (!entry || entry.resetAt < now) return false;
    return entry.count >= max;
  }

  function hit(key: string, now = Date.now()) {
    // Drop expired entries now and then so the map can't grow without bound.
    if (entries.size >= pruneAt) {
      for (const [k, e] of entries) if (e.resetAt < now) entries.delete(k);
    }
    const entry = entries.get(key);
    if (!entry || entry.resetAt < now) entries.set(key, { count: 1, resetAt: now + windowMs });
    else entry.count += 1;
  }

  /**
   * Checks the limit and counts in one synchronous step, before any await, so parallel requests
   * can't all pass the check while the count is still 0. Returns false when the key is throttled.
   */
  function reserve(key: string, now = Date.now()) {
    if (isThrottled(key, now)) return false;
    hit(key, now);
    return true;
  }

  return { isThrottled, hit, reserve, clear: (key: string) => void entries.delete(key) };
}
