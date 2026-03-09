type SlidingWindowRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type SlidingWindowRateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
};

type RateLimitStore = Map<string, number[]>;

const globalRateLimitStore = globalThis as typeof globalThis & {
  __rateLimitStore?: RateLimitStore;
};

const rateLimitStore: RateLimitStore =
  globalRateLimitStore.__rateLimitStore ??
  (globalRateLimitStore.__rateLimitStore = new Map<string, number[]>());

function pruneExpiredRateLimitEntries(windowStart: number): void {
  for (const [storedKey, timestamps] of rateLimitStore.entries()) {
    const recentTimestamps = timestamps.filter(
      (timestamp) => timestamp > windowStart,
    );

    if (recentTimestamps.length === 0) {
      rateLimitStore.delete(storedKey);
      continue;
    }

    if (recentTimestamps.length !== timestamps.length) {
      rateLimitStore.set(storedKey, recentTimestamps);
    }
  }
}

export function enforceSlidingWindowRateLimit({
  key,
  limit,
  windowMs,
}: SlidingWindowRateLimitOptions): SlidingWindowRateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  pruneExpiredRateLimitEntries(windowStart);
  const recentRequests = [...(rateLimitStore.get(key) ?? [])];

  if (recentRequests.length >= limit) {
    const oldestRequest = recentRequests[0];
    const resetAt = oldestRequest + windowMs;

    rateLimitStore.set(key, recentRequests);

    return {
      success: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfterMs: Math.max(resetAt - now, 0),
    };
  }

  recentRequests.push(now);
  rateLimitStore.set(key, recentRequests);

  const resetAt = recentRequests[0] + windowMs;

  return {
    success: true,
    limit,
    remaining: Math.max(limit - recentRequests.length, 0),
    resetAt,
    retryAfterMs: 0,
  };
}
