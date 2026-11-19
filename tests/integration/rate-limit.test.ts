import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/server/rate-limit";

describe("rate limit (NFREQ16)", () => {
  it("blocks after the limit and resets after the window", async () => {
    const rule = { limit: 2, windowMs: 1000 };
    const t = (ms: number) => new Date(Date.UTC(2026, 0, 1) + ms);
    expect(await consumeRateLimit("k", rule, t(0))).toBe(true);
    expect(await consumeRateLimit("k", rule, t(10))).toBe(true);
    expect(await consumeRateLimit("k", rule, t(20))).toBe(false);
    expect(await consumeRateLimit("k", rule, t(1001))).toBe(true);
  });

  it("counts concurrent attempts atomically", async () => {
    const rule = { limit: 5, windowMs: 60_000 };
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit("burst", rule)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
