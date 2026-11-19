// UC-1 Create Account, UC-2 View Profile, FREQ1/4/6/9/47/48/49.
import { Prisma, type EmailTokenPurpose } from "@prisma/client";
import { db } from "@/server/db";
import { getConfig } from "@/server/config";
import { ServiceError } from "@/server/errors";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { createSession, invalidateAllSessions } from "@/server/auth/session";
import { sendMail } from "@/server/mail/mailer";
import { passwordResetEmail, verificationEmail } from "@/server/mail/templates";
import { parseOrThrow } from "@/server/validation/parse";
import {
  emailDomain,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/server/validation/account";

const TOKEN_TTL_MS: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

const USERNAME_TAKEN = () =>
  new ServiceError("USERNAME_TAKEN", "That username is taken.", {
    username: ["That username is taken."],
  });

async function issueEmailToken(userId: string, purpose: EmailTokenPurpose): Promise<string> {
  const token = generateToken();
  // Only the newest link of each kind works.
  await db.$transaction([
    db.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.emailToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
      },
    }),
  ]);
  return token;
}

/** Marks a token used and returns its user id, or throws if it is unknown, used or expired. */
async function consumeEmailToken(token: string, purpose: EmailTokenPurpose): Promise<string> {
  const record = await db.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date()) {
    throw new ServiceError("INVALID_TOKEN", "This link is invalid or has expired.");
  }
  const claimed = await db.emailToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw new ServiceError("INVALID_TOKEN", "This link has already been used.");
  return record.userId;
}

async function sendVerification(user: { id: string; email: string; fullName: string }) {
  const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
  const link = `${getConfig().appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail(verificationEmail(user.email, user.fullName, link));
}

export async function register(input: unknown) {
  const data = parseOrThrow(registerSchema, input);
  const { allowedEmailDomains } = getConfig();
  if (!allowedEmailDomains.includes(emailDomain(data.email))) {
    throw new ServiceError("EMAIL_DOMAIN", "Use your official school email address.", {
      email: [`Use your school email (${allowedEmailDomains.map((d) => "@" + d).join(", ")}).`],
    });
  }

  const existing = await db.user.findFirst({
    where: { OR: [{ email: data.email }, { usernameKey: data.username.toLowerCase() }] },
    select: { email: true },
  });
  // UC-1 extension "Email already in use": the spec asks us to say so explicitly.
  if (existing?.email === data.email) {
    throw new ServiceError("EMAIL_TAKEN", "An account with this email already exists.", {
      email: ["An account with this email already exists. Try logging in or resetting your password."],
    });
  }
  if (existing) throw USERNAME_TAKEN();

  let user;
  try {
    user = await db.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        username: data.username,
        usernameKey: data.username.toLowerCase(),
        passwordHash: await hashPassword(data.password),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ServiceError("EMAIL_OR_USERNAME_TAKEN", "That email or username is already in use.");
    }
    throw err;
  }
  await sendVerification(user);
  return { id: user.id, email: user.email };
}

export async function verifyEmail(token: string) {
  const userId = await consumeEmailToken(token, "VERIFY_EMAIL");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return { userId };
}

/** Always succeeds silently so it can't be used to probe which emails exist. */
export async function resendVerification(input: unknown): Promise<void> {
  const { email } = parseOrThrow(emailOnlySchema, input);
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt && user.status === "ACTIVE") await sendVerification(user);
}

export async function login(input: unknown) {
  const { email, password } = parseOrThrow(loginSchema, input);
  const user = await db.user.findUnique({ where: { email } });
  const invalid = new ServiceError("INVALID_CREDENTIALS", "Incorrect email or password.");

  if (!user || user.status === "REMOVED") {
    await verifyAgainstDummy(password);
    throw invalid;
  }
  if (!(await verifyPassword(user.passwordHash, password))) throw invalid;
  if (user.status === "SUSPENDED") {
    throw new ServiceError("SUSPENDED", "This account is suspended. Contact an administrator.");
  }
  if (!user.emailVerifiedAt) {
    throw new ServiceError("EMAIL_NOT_VERIFIED", "Verify your email before logging in.");
  }
  return createSession(user.id);
}

/** Always succeeds silently so it can't be used to probe which emails exist. */
export async function requestPasswordReset(input: unknown): Promise<void> {
  const { email } = parseOrThrow(emailOnlySchema, input);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueEmailToken(user.id, "PASSWORD_RESET");
  const link = `${getConfig().appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail(passwordResetEmail(user.email, user.fullName, link));
}

export async function resetPassword(input: unknown): Promise<void> {
  const { token, password } = parseOrThrow(resetPasswordSchema, input);
  const userId = await consumeEmailToken(token, "PASSWORD_RESET");
  await db.user.update({
    where: { id: userId },
    // Receiving the reset email proves control of the address.
    data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
  });
  // Sign out everywhere after a reset.
  await invalidateAllSessions(userId);
}

export async function getOwnProfile(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, username: true, isAdmin: true, createdAt: true },
  });
}

export async function updateOwnProfile(userId: string, input: unknown) {
  const data = parseOrThrow(updateProfileSchema, input);
  const usernameKey = data.username.toLowerCase();
  const clash = await db.user.findFirst({ where: { usernameKey, NOT: { id: userId } }, select: { id: true } });
  if (clash) throw USERNAME_TAKEN();
  try {
    return await db.user.update({
      where: { id: userId },
      data: { fullName: data.fullName, username: data.username, usernameKey },
      select: { id: true, fullName: true, username: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw USERNAME_TAKEN();
    throw err;
  }
}

/**
 * FREQ9 profile of another user. Full name and email are only included when the viewer may see PII
 * (baseline C6); otherwise only first name.
 */
export async function getPublicProfile(username: string, opts: { includePii: boolean }) {
  const user = await db.user.findUnique({
    where: { usernameKey: username.toLowerCase() },
    select: { id: true, username: true, fullName: true, email: true, status: true, createdAt: true },
  });
  if (!user || user.status === "REMOVED") return null;
  const firstName = user.fullName.split(/\s+/)[0];
  return {
    id: user.id,
    username: user.username,
    firstName,
    memberSince: user.createdAt,
    ...(opts.includePii ? { fullName: user.fullName, email: user.email } : {}),
  };
}
