// UC-10 Moderate User Accounts: FREQ36 suspend, FREQ59 lift, FREQ37 remove (anonymize). Audited (NFREQ12).
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { generateToken } from "@/server/auth/tokens";
import { parseLocalDateTime } from "@/lib/time";
import { ADMIN_SET_LOCK } from "./role-service";

type Tx = Prisma.TransactionClient;

const suspendSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason.").max(500),
  until: z
    .union([z.string(), z.date(), z.undefined()])
    .transform((v, ctx) => {
      if (v === undefined || v === "") return null;
      const d = v instanceof Date ? v : parseLocalDateTime(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
        return z.NEVER;
      }
      if (d <= new Date()) {
        ctx.addIssue({ code: "custom", message: "Must be in the future." });
        return z.NEVER;
      }
      return d;
    }),
});

const removeSchema = z.object({ reason: z.string().trim().min(3, "Give a short reason.").max(500) });

/** Blocks actions that would leave no active Admin. Call inside a transaction. */
async function guardLastAdmin(tx: Tx, target: { id: string; isAdmin: boolean; status: string }) {
  if (!target.isAdmin || target.status !== "ACTIVE") return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_SET_LOCK})`;
  const admins = await tx.user.count({ where: { isAdmin: true, status: "ACTIVE" } });
  if (admins <= 1) throw new ServiceError("LAST_ADMIN", "There must be at least one active Admin.");
}

async function loadTarget(actor: AuthzContext, userId: string) {
  authorize(actor, "users.moderate", { type: "global" });
  if (userId === actor.userId) throw new ServiceError("SELF", "You can't moderate your own account.");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "REMOVED") throw new NotFoundError("User not found.");
  return user;
}

export async function suspendUser(actor: AuthzContext, userId: string, input: unknown) {
  const user = await loadTarget(actor, userId);
  if (user.status === "SUSPENDED") throw new ServiceError("ALREADY_SUSPENDED", "This account is already suspended.");
  const data = parseOrThrow(suspendSchema, input);
  await db.$transaction(async (tx) => {
    await guardLastAdmin(tx, user);
    await tx.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
    await tx.suspension.create({ data: { userId, reason: data.reason, until: data.until, createdById: actor.userId } });
    await tx.session.deleteMany({ where: { userId } }); // signs them out everywhere
    await recordAudit(
      { actorId: actor.userId, action: "user.suspend", targetType: "user", targetId: userId, details: { reason: data.reason, until: data.until?.toISOString() ?? null } },
      tx,
    );
  });
}

export async function liftSuspension(actor: AuthzContext, userId: string) {
  const user = await loadTarget(actor, userId);
  if (user.status !== "SUSPENDED") throw new ServiceError("NOT_SUSPENDED", "This account isn't suspended.");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    await tx.suspension.updateMany({ where: { userId, liftedAt: null }, data: { liftedAt: new Date() } });
    await recordAudit({ actorId: actor.userId, action: "user.unsuspend", targetType: "user", targetId: userId }, tx);
  });
}

/** Lifts a timed suspension whose end has passed. Returns the current suspension if still in force. */
export async function refreshSuspension(userId: string) {
  const current = await db.suspension.findFirst({ where: { userId, liftedAt: null }, orderBy: { createdAt: "desc" } });
  if (current?.until && current.until <= new Date()) {
    await db.$transaction([
      db.user.updateMany({ where: { id: userId, status: "SUSPENDED" }, data: { status: "ACTIVE" } }),
      db.suspension.update({ where: { id: current.id }, data: { liftedAt: new Date() } }),
    ]);
    await recordAudit({ actorId: null, action: "user.unsuspend.expired", targetType: "user", targetId: userId });
    return null;
  }
  return current;
}

/**
 * FREQ37: soft-delete + anonymize (baseline §3). Personal data is erased, memberships and
 * integrations removed; VODs, stats and comments they authored remain, shown as a removed user.
 */
export async function removeUser(actor: AuthzContext, userId: string, input: unknown) {
  const user = await loadTarget(actor, userId);
  const { reason } = parseOrThrow(removeSchema, input);
  const tag = userId.slice(-8);
  await db.$transaction(async (tx) => {
    await guardLastAdmin(tx, user);
    await tx.session.deleteMany({ where: { userId } });
    await tx.emailToken.deleteMany({ where: { userId } });
    await tx.teamMembership.deleteMany({ where: { userId } });
    await tx.communityMembership.deleteMany({ where: { userId } });
    await tx.gameManagerAssignment.deleteMany({ where: { userId } });
    await tx.rosterRequest.updateMany({ where: { userId, status: "PENDING" }, data: { status: "CANCELLED", decidedAt: new Date() } });
    await tx.discordLink.deleteMany({ where: { userId } });
    await tx.calendarFeedToken.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        status: "REMOVED",
        isAdmin: false,
        email: `removed+${userId}@invalid`,
        fullName: "Removed user",
        username: `removed_${tag}`,
        usernameKey: `removed_${tag}`,
        passwordHash: `!removed:${generateToken()}`,
      },
    });
    await recordAudit({ actorId: actor.userId, action: "user.remove", targetType: "user", targetId: userId, details: { reason } }, tx);
  });
}

export async function getModerationInfo(actor: AuthzContext, userId: string) {
  authorize(actor, "users.moderate", { type: "global" });
  const [current, history, discord] = await Promise.all([
    db.suspension.findFirst({ where: { userId, liftedAt: null }, orderBy: { createdAt: "desc" } }),
    db.suspension.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { createdBy: { select: { username: true } } } }),
    db.discordLink.findUnique({ where: { userId } }),
  ]);
  return { current, history, discord };
}
