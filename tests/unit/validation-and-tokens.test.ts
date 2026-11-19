import { describe, expect, it } from "vitest";
import { registerSchema, emailDomain } from "@/server/validation/account";
import { generateToken, hashToken } from "@/server/auth/tokens";

describe("registration validation", () => {
  const valid = { email: " Alex@Example.EDU ", fullName: "Alex Kim", username: "alex_k", password: "a-strong-password" };

  it("normalizes email", () => {
    expect(registerSchema.parse(valid).email).toBe("alex@example.edu");
    expect(emailDomain("alex@example.edu")).toBe("example.edu");
  });

  it.each([
    ["short password", { password: "short" }],
    ["bad username", { username: "no spaces!" }],
    ["short username", { username: "ab" }],
    ["empty name", { fullName: "  " }],
    ["bad email", { email: "nope" }],
  ])("rejects %s", (_label, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("tokens", () => {
  it("are unique, URL-safe and hashed deterministically", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(generateToken());
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});
