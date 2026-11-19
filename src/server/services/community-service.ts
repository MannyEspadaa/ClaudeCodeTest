// FREQ51 join/leave a Game Community; community page (restored use case "View Community Page").
import { db } from "@/server/db";
import { authorize } from "@/server/authz/context";
import { can, type AuthzContext } from "@/server/authz/policy";
import { assertGameActive, getGameBySlug, requireGame } from "./game-service";

export async function joinCommunity(actor: AuthzContext, gameId: string) {
  authorize(actor, "community.join", { type: "game", gameId });
  assertGameActive(await requireGame(gameId));
  await db.communityMembership.upsert({
    where: { userId_gameId: { userId: actor.userId, gameId } },
    create: { userId: actor.userId, gameId },
    update: {},
  });
}

/**
 * Leaving a community also takes the user off that game's teams and cancels their pending requests,
 * because team membership requires community membership (baseline C4).
 */
export async function leaveCommunity(actor: AuthzContext, gameId: string) {
  authorize(actor, "community.join", { type: "game", gameId });
  await requireGame(gameId);
  return db.$transaction(async (tx) => {
    const left = await tx.teamMembership.deleteMany({ where: { userId: actor.userId, team: { gameId } } });
    await tx.rosterRequest.updateMany({
      where: { userId: actor.userId, status: "PENDING", team: { gameId } },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });
    await tx.communityMembership.deleteMany({ where: { userId: actor.userId, gameId } });
    return { teamsLeft: left.count };
  });
}

export async function getCommunityPage(actor: AuthzContext, slug: string) {
  const game = await getGameBySlug(slug);
  const resource = { type: "game" as const, gameId: game.id };
  const [memberCount, managers] = await Promise.all([
    db.communityMembership.count({ where: { gameId: game.id, user: { status: "ACTIVE" } } }),
    db.gameManagerAssignment.findMany({
      where: { gameId: game.id, user: { status: "ACTIVE" } },
      select: { user: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const base = {
    game,
    memberCount,
    managers: managers.map((m) => m.user.username),
    isMember: actor.communityGameIds.has(game.id),
    canManage: can(actor, "team.create", resource),
    canView: can(actor, "community.view", resource),
  };
  if (!base.canView) return { ...base, teams: [] };

  const teams = await db.team.findMany({
    where: { gameId: game.id, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
      requests: { where: { userId: actor.userId, status: "PENDING" }, select: { id: true } },
    },
  });
  return {
    ...base,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      season: t.season,
      rosterCount: t._count.members,
      maxRosterSize: t.maxRosterSize,
      isFull: t.maxRosterSize !== null && t._count.members >= t.maxRosterSize,
      isOnTeam: actor.teamIds.has(t.id),
      pendingRequestId: t.requests[0]?.id ?? null,
    })),
  };
}

/** FREQ7 / FREQ9: communities and teams shown on profiles (names are visible to logged-in users, C6). */
export async function getMemberships(userId: string) {
  const [communities, teams] = await Promise.all([
    db.communityMembership.findMany({
      where: { userId },
      include: { game: { select: { id: true, name: true, slug: true, status: true } } },
      orderBy: { game: { name: "asc" } },
    }),
    db.teamMembership.findMany({
      where: { userId },
      include: { team: { select: { id: true, name: true, status: true, game: { select: { id: true, name: true, slug: true } } } } },
      orderBy: { team: { name: "asc" } },
    }),
  ]);
  return {
    communities: communities.map((c) => c.game),
    teams: teams.map((t) => ({ id: t.team.id, name: t.team.name, status: t.team.status, game: t.team.game })),
  };
}
