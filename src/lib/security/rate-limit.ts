import "server-only";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

let writeCountSincePrune = 0;

function pruneExpiredBuckets(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function consumeRateLimit(
  action: string,
  userKey: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  writeCountSincePrune += 1;

  if (writeCountSincePrune >= 100 || buckets.size >= 1000) {
    pruneExpiredBuckets(now);
    writeCountSincePrune = 0;
  }

  const bucketKey = `${action}:${userKey}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  if (existing.count >= config.limit) {
    return false;
  }

  existing.count += 1;
  return true;
}
