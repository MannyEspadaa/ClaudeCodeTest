// Next.js glue: reads the session cookie. Keep framework imports out of services.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getConfig } from "@/server/config";
import { loadAuthzContext } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { SESSION_COOKIE, validateSessionToken, type SessionUser } from "./session";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSessionToken(token) : null;
});

/** Per-request cached authorization context (null when signed out). */
export const getActor = cache(async (): Promise<AuthzContext | null> => {
  const user = await getCurrentUser();
  return user ? loadAuthzContext(user) : null;
});

export async function requireUser(): Promise<{ user: SessionUser; ctx: AuthzContext }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user, ctx: (await getActor())! };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getConfig().isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Layouts don't protect the pages beneath them (pages render in parallel), so every
 * admin page calls this itself. Returns null for non-admins so the page can render NoAccess.
 */
export async function requireAdmin(): Promise<{ user: SessionUser; ctx: AuthzContext } | null> {
  const res = await requireUser();
  return res.ctx.isAdmin ? res : null;
}
