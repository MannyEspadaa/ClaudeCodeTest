// NFREQ16: fixed-window rate limiting for auth endpoints, stored in Postgres so limits hold
// across multiple app instances.
import { db } from "@/server/db";

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

/** Records one attempt atomically; returns false when the key is over its limit. */
export async function consumeRateLimit(key: string, rule: RateLimitRule, now = new Date()): Promise<boolean> {
  const resetAt = new Date(now.getTime() + rule.windowMs);
  const [row] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count"`;
  // Occasionally clear out expired buckets.
  if (Math.random() < 0.01) await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } });
  return row.count <= rule.limit * scale();
}

export async function resetRateLimits(): Promise<void> {
  await db.rateLimitBucket.deleteMany();
}
