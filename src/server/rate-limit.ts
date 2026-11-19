// NFREQ16: fixed-window, in-memory rate limiting for auth endpoints.
// Single-instance only; swap for a shared store (e.g. Postgres/Redis) if the app is scaled out.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitRule = { limit: number; windowMs: number };

// Per-IP limits are generous because many students share a campus NAT address;
// per-account limits do most of the work against password guessing.
export const RATE_LIMITS = {
  loginPerIp: { limit: 100, windowMs: 15 * 60 * 1000 },
  loginPerAccount: { limit: 10, windowMs: 15 * 60 * 1000 },
  registerPerIp: { limit: 50, windowMs: 60 * 60 * 1000 },
  emailPerAddress: { limit: 5, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

/** RATE_LIMIT_SCALE multiplies every limit (e.g. 100 in end-to-end tests). */
function scale(): number {
  const n = Number(process.env.RATE_LIMIT_SCALE ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Records one attempt; returns false when the key is over its limit. */
export function consumeRateLimit(key: string, rule: RateLimitRule, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= rule.limit * scale();
}

export function resetRateLimits(): void {
  buckets.clear();
}
