// UC-1 Create Account (+ extensions), FREQ4 verification, FREQ47/48 login & reset, FREQ49 profile edit.
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { memoryOutbox } from "@/server/mail/mailer";
import { ServiceError } from "@/server/errors";
import { validateSessionToken } from "@/server/auth/session";
import * as accounts from "@/server/services/account-service";
import { PASSWORD, registerVerified, tokenFromLastMail } from "./helpers";

async function expectCode(promise: Promise<unknown>, code: string) {
  const err = await promise.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(ServiceError);
  expect((err as ServiceError).code).toBe(code);
  return err as ServiceError;
}

const base = { email: "alex@example.edu", fullName: "Alex Kim", username: "alex_k", password: PASSWORD };

describe("register (UC-1)", () => {
  it("creates an unverified account, stores a hashed password and emails a verification link", async () => {
    await accounts.register(base);
    const user = await db.user.findUniqueOrThrow({ where: { email: "alex@example.edu" } });
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(memoryOutbox).toHaveLength(1);
    expect(memoryOutbox[0].to).toBe("alex@example.edu");
    expect(memoryOutbox[0].text).toContain("/verify-email?token=");
  });

  it("rejects emails outside the school domain (FREQ1)", async () => {
    const err = await expectCode(accounts.register({ ...base, email: "alex@gmail.com" }), "EMAIL_DOMAIN");
    expect(err.fieldErrors.email).toBeDefined();
  });

  it("extension: email already in use", async () => {
    await accounts.register(base);
    await expectCode(accounts.register({ ...base, email: "ALEX@example.edu", username: "other" }), "EMAIL_TAKEN");
  });

  it("rejects a username taken in a different case", async () => {
    await accounts.register(base);
    await expectCode(accounts.register({ ...base, email: "b@example.edu", username: "ALEX_K" }), "USERNAME_TAKEN");
  });

  it("extension: invalid registration information returns field errors", async () => {
    const err = await expectCode(accounts.register({ ...base, password: "short", username: "x" }), "VALIDATION");
    expect(Object.keys(err.fieldErrors).sort()).toEqual(["password", "username"]);
  });
});

describe("email verification (FREQ4)", () => {
  it("blocks login until verified, then allows it", async () => {
    await accounts.register(base);
    await expectCode(accounts.login(base), "EMAIL_NOT_VERIFIED");
    await accounts.verifyEmail(tokenFromLastMail("verify-email"));
    const session = await accounts.login(base);
    expect((await validateSessionToken(session.token))?.email).toBe("alex@example.edu");
  });

  it("tokens are single use", async () => {
    await accounts.register(base);
    const token = tokenFromLastMail("verify-email");
    await accounts.verifyEmail(token);
    await expectCode(accounts.verifyEmail(token), "INVALID_TOKEN");
  });

  it("resending invalidates the previous link", async () => {
    await accounts.register(base);
    const first = tokenFromLastMail("verify-email");
    await accounts.resendVerification({ email: base.email });
    await expectCode(accounts.verifyEmail(first), "INVALID_TOKEN");
    await accounts.verifyEmail(tokenFromLastMail("verify-email"));
  });

  it("expired tokens are rejected", async () => {
    await accounts.register(base);
    const token = tokenFromLastMail("verify-email");
    await db.emailToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expectCode(accounts.verifyEmail(token), "INVALID_TOKEN");
  });

  it("resend is silent for unknown emails", async () => {
    await accounts.resendVerification({ email: "ghost@example.edu" });
    expect(memoryOutbox).toHaveLength(0);
  });
});

describe("login (FREQ47)", () => {
  it("uses the same error for a wrong password and an unknown email", async () => {
    await registerVerified();
    const a = await expectCode(accounts.login({ ...base, password: "wrong-password!" }), "INVALID_CREDENTIALS");
    const b = await expectCode(accounts.login({ ...base, email: "ghost@example.edu" }), "INVALID_CREDENTIALS");
    expect(a.message).toBe(b.message);
  });

  it("refuses suspended and removed accounts", async () => {
    await registerVerified();
    await db.user.update({ where: { email: base.email }, data: { status: "SUSPENDED" } });
    await expectCode(accounts.login(base), "SUSPENDED");
    await db.user.update({ where: { email: base.email }, data: { status: "REMOVED" } });
    await expectCode(accounts.login(base), "INVALID_CREDENTIALS");
  });

  it("sessions stop working when the user is suspended or the session expires", async () => {
    await registerVerified();
    const s1 = await accounts.login(base);
    await db.user.update({ where: { email: base.email }, data: { status: "SUSPENDED" } });
    expect(await validateSessionToken(s1.token)).toBeNull();

    await db.user.update({ where: { email: base.email }, data: { status: "ACTIVE" } });
    const s2 = await accounts.login(base);
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1) } });
    expect(await validateSessionToken(s2.token)).toBeNull();
  });
});

describe("password reset (FREQ48)", () => {
  it("resets the password, signs out other sessions and consumes the token", async () => {
    await registerVerified();
    const oldSession = await accounts.login(base);
    await accounts.requestPasswordReset({ email: base.email });
    const token = tokenFromLastMail("reset-password");

    await accounts.resetPassword({ token, password: "a-brand-new-password" });

    expect(await validateSessionToken(oldSession.token)).toBeNull();
    await expectCode(accounts.login(base), "INVALID_CREDENTIALS");
    await accounts.login({ ...base, password: "a-brand-new-password" });
    await expectCode(accounts.resetPassword({ token, password: "another-password-1" }), "INVALID_TOKEN");
  });

  it("is silent for unknown emails", async () => {
    await accounts.requestPasswordReset({ email: "ghost@example.edu" });
    expect(memoryOutbox).toHaveLength(0);
  });

  it("a verification token cannot be used as a reset token", async () => {
    await accounts.register(base);
    await expectCode(
      accounts.resetPassword({ token: tokenFromLastMail("verify-email"), password: "a-brand-new-password" }),
      "INVALID_TOKEN",
    );
  });
});

describe("profiles (FREQ6, FREQ9, FREQ49)", () => {
  it("updates name and username, enforcing case-insensitive uniqueness", async () => {
    const me = await registerVerified();
    await registerVerified({ email: "sam@example.edu", username: "Sam" });
    await expectCode(accounts.updateOwnProfile(me.id, { fullName: "Alex K", username: "sam" }), "USERNAME_TAKEN");
    const updated = await accounts.updateOwnProfile(me.id, { fullName: "Alex Kimura", username: "AlexK" });
    expect(updated).toMatchObject({ fullName: "Alex Kimura", username: "AlexK" });
  });

  it("public profile hides full name and email unless allowed", async () => {
    await registerVerified();
    const limited = await accounts.getPublicProfile("ALEX_K", { includePii: false });
    expect(limited).toMatchObject({ username: "alex_k", firstName: "Alex" });
    expect(limited).not.toHaveProperty("email");
    expect(limited).not.toHaveProperty("fullName");
    const full = await accounts.getPublicProfile("alex_k", { includePii: true });
    expect(full).toMatchObject({ fullName: "Alex Kim", email: "alex@example.edu" });
  });

  it("removed users have no public profile", async () => {
    await registerVerified();
    await db.user.update({ where: { email: base.email }, data: { status: "REMOVED" } });
    expect(await accounts.getPublicProfile("alex_k", { includePii: false })).toBeNull();
  });
});
