// UC-9 Manage User Roles: FREQ32-34, 52, 53. All changes are audited (NFREQ12).
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { requireGame } from "./game-service";

const PAGE_SIZE = 25;

export async function listUsers(actor: AuthzContext, opts: { q?: string; page?: number } = {}) {
  authorize(actor, "roles.manage", { type: "global" });
  const q = opts.q?.trim();
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.UserWhereInput = {
    status: { not: "REMOVED" },
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        isAdmin: true,
        status: true,
        emailVerifiedAt: true,
        managedGames: { select: { game: { select: { name: true } } } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    users: users.map(({ managedGames, ...u }) => ({ ...u, managedGames: managedGames.map((m) => m.game.name) })),
  };
}

export async function getUserRoles(actor: AuthzContext, userId: string) {
  authorize(actor, "roles.manage", { type: "global" });
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      isAdmin: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      managedGames: { select: { gameId: true } },
    },
  });
  if (!user) throw new NotFoundError("User not found.");
  const [games, audit] = await Promise.all([
    db.game.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } }),
    db.auditLog.findMany({
      where: { targetType: "user", targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { username: true } } },
    }),
  ]);
  const managed = new Set(user.managedGames.map((m) => m.gameId));
  return {
    user,
    games: games.map((g) => ({ ...g, isManager: managed.has(g.id) })),
    audit: audit.map((a) => ({ id: a.id, action: a.action, createdAt: a.createdAt, actor: a.actor?.username ?? "system", details: a.details })),
  };
}

async function requireActiveUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found.");
  if (user.status !== "ACTIVE") throw new ServiceError("USER_INACTIVE", "That account is suspended or removed.");
  return user;
}

/** Grants the GM role for one game; the user also joins that game's community. */
export async function assignGameManager(actor: AuthzContext, userId: string, gameId: string) {
  authorize(actor, "roles.manage", { type: "global" });
  await requireActiveUser(userId);
  await requireGame(gameId);
  await db.$transaction(async (tx) => {
    await tx.gameManagerAssignment.upsert({
      where: { userId_gameId: { userId, gameId } },
      create: { userId, gameId, assignedById: actor.userId },
      update: {},
    });
    await tx.communityMembership.upsert({ where: { userId_gameId: { userId, gameId } }, create: { userId, gameId }, update: {} });
    await recordAudit({ actorId: actor.userId, action: "role.gm.grant", targetType: "user", targetId: userId, details: { gameId } }, tx);
  });
}

export async function unassignGameManager(actor: AuthzContext, userId: string, gameId: string) {
  authorize(actor, "roles.manage", { type: "global" });
  const res = await db.gameManagerAssignment.deleteMany({ where: { userId, gameId } });
  if (res.count === 0) throw new NotFoundError("That user doesn't manage this game.");
  await recordAudit({ actorId: actor.userId, action: "role.gm.revoke", targetType: "user", targetId: userId, details: { gameId } });
}

export async function grantAdmin(actor: AuthzContext, userId: string) {
  authorize(actor, "roles.manage", { type: "global" });
  const user = await requireActiveUser(userId);
  if (!user.emailVerifiedAt) throw new ServiceError("NOT_VERIFIED", "The user must verify their email first.");
  if (user.isAdmin) return;
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isAdmin: true } });
    await recordAudit({ actorId: actor.userId, action: "role.admin.grant", targetType: "user", targetId: userId }, tx);
  });
}

/** Lock key that serialises every change to the set of active admins. */
export const ADMIN_SET_LOCK = 724_001;

/** FREQ53: admins can't revoke themselves, and the last active admin can't be revoked. */
export async function revokeAdmin(actor: AuthzContext, userId: string) {
  authorize(actor, "roles.manage", { type: "global" });
  if (userId === actor.userId) throw new ServiceError("SELF_REVOKE", "You can't remove your own Admin role.");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_SET_LOCK})`;
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundError("User not found.");
    if (!target.isAdmin) return;
    const admins = await tx.user.count({ where: { isAdmin: true, status: "ACTIVE" } });
    if (target.status === "ACTIVE" && admins <= 1) throw new ServiceError("LAST_ADMIN", "There must be at least one active Admin.");
    await tx.user.update({ where: { id: userId }, data: { isAdmin: false } });
    await recordAudit({ actorId: actor.userId, action: "role.admin.revoke", targetType: "user", targetId: userId }, tx);
  });
}
