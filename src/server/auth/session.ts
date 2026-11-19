import type { User } from "@prisma/client";
import { db } from "@/server/db";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = Pick<
  User,
  "id" | "email" | "fullName" | "username" | "isAdmin" | "status" | "emailVerifiedAt"
>;

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** Returns the user for a valid session token, or null. Expired sessions and inactive users are rejected. */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          isAdmin: true,
          status: true,
          emailVerifiedAt: true,
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
