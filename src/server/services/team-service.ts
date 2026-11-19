// FREQ26-28, 44, 57, 58: Game Managers create, modify, archive and delete teams.
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { authorize } from "@/server/authz/context";
import { can, type AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { optionalPositiveInt, optionalText } from "@/server/validation/common";
import { assertGameActive, requireGame } from "./game-service";

export const MAX_ROSTER_LIMIT = 100;

const teamSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60, "Name must be at most 60 characters."),
  maxRosterSize: optionalPositiveInt(MAX_ROSTER_LIMIT),
  season: optionalText(40),
});

const NAME_TAKEN = () =>
  new ServiceError("TEAM_NAME_TAKEN", "This game already has a team with that name.", { name: ["This game already has a team with that name."] });

export async function requireTeam(teamId: string) {
  const team = await db.team.findUnique({ where: { id: teamId }, include: { game: true } });
  if (!team) throw new NotFoundError("Team not found.");
  return team;
}

export function teamResource(team: { id: string; gameId: string }) {
  return { type: "team" as const, teamId: team.id, gameId: team.gameId };
}

export async function createTeam(actor: AuthzContext, gameId: string, input: unknown) {
  authorize(actor, "team.create", { type: "game", gameId });
  assertGameActive(await requireGame(gameId));
  const data = parseOrThrow(teamSchema, input);
  try {
    return await db.team.create({ data: { gameId, ...data } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw NAME_TAKEN();
    throw err;
  }
}

export async function updateTeam(actor: AuthzContext, teamId: string, input: unknown) {
  const team = await requireTeam(teamId);
  authorize(actor, "team.manage", teamResource(team));
  const data = parseOrThrow(teamSchema, input);
  if (data.maxRosterSize !== null) {
    const count = await db.teamMembership.count({ where: { teamId } });
    if (data.maxRosterSize < count) {
      const msg = `The roster already has ${count} players.`;
      throw new ServiceError("CAPACITY_BELOW_ROSTER", msg, { maxRosterSize: [msg] });
    }
  }
  try {
    return await db.team.update({ where: { id: teamId }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw NAME_TAKEN();
    throw err;
  }
}

/** FREQ28: only shell teams (never had players) can be deleted. Others are archived instead. */
export async function deleteTeam(actor: AuthzContext, teamId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "team.manage", teamResource(team));
  const members = await db.teamMembership.count({ where: { teamId } });
  if (team.status !== "SHELL" || members > 0) {
    throw new ServiceError("NOT_SHELL", "Only shell teams with no players can be deleted. Archive this team instead.");
  }
  await db.$transaction(async (tx) => {
    await tx.team.delete({ where: { id: teamId } });
    await recordAudit(
      { actorId: actor.userId, action: "team.delete", targetType: "team", targetId: teamId, details: { name: team.name, gameId: team.gameId } },
      tx,
    );
  });
}

export async function setTeamArchived(actor: AuthzContext, teamId: string, archived: boolean) {
  const team = await requireTeam(teamId);
  authorize(actor, "team.manage", teamResource(team));
  if (!archived) assertGameActive(team.game);
  await db.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
    if (archived) {
      await tx.rosterRequest.updateMany({ where: { teamId, status: "PENDING" }, data: { status: "CANCELLED", decidedAt: new Date() } });
    }
    await recordAudit({ actorId: actor.userId, action: archived ? "team.archive" : "team.unarchive", targetType: "team", targetId: teamId }, tx);
  });
}

const rosterSelect = {
  joinedAt: true,
  user: { select: { id: true, username: true, fullName: true, status: true } },
} as const;

/** Team page for its Players, the game's Managers and Admins (team.view). */
export async function getTeamPage(actor: AuthzContext, teamId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "team.view", teamResource(team));
  const canManage = can(actor, "roster.manage", teamResource(team));
  const roster = await db.teamMembership.findMany({
    where: { teamId, user: { status: "ACTIVE" } },
    select: rosterSelect,
    orderBy: { joinedAt: "asc" },
  });
  return {
    team,
    canManage,
    isOnTeam: actor.teamIds.has(teamId),
    roster: roster.map((m) => ({
      userId: m.user.id,
      username: m.user.username,
      // C6: full names only for the game's managers and admins.
      name: canManage ? m.user.fullName : m.user.fullName.split(/\s+/)[0],
      joinedAt: m.joinedAt,
    })),
  };
}

/** FREQ44 team management page. */
export async function getTeamManagement(actor: AuthzContext, teamId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "roster.manage", teamResource(team));
  const [roster, requests, community] = await Promise.all([
    db.teamMembership.findMany({ where: { teamId }, select: rosterSelect, orderBy: { joinedAt: "asc" } }),
    db.rosterRequest.findMany({
      where: { teamId, status: "PENDING" },
      include: { user: { select: { id: true, username: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.communityMembership.findMany({
      where: { gameId: team.gameId, user: { status: "ACTIVE", teamMemberships: { none: { teamId } } } },
      include: { user: { select: { id: true, username: true, fullName: true } } },
      orderBy: { user: { username: "asc" } },
    }),
  ]);
  return {
    team,
    roster: roster.map((m) => ({ ...m.user, joinedAt: m.joinedAt })),
    requests: requests.map((r) => ({ id: r.id, createdAt: r.createdAt, user: r.user })),
    eligible: community.map((c) => c.user),
  };
}

/** Games the actor manages (all games for Admins) with their teams and pending request counts. */
export async function listManagedGames(actor: AuthzContext) {
  const where = actor.isAdmin ? {} : { id: { in: [...actor.managedGameIds] } };
  const games = await db.game.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      teams: {
        orderBy: [{ status: "asc" }, { name: "asc" }],
        include: { _count: { select: { members: true, requests: { where: { status: "PENDING" } } } } },
      },
    },
  });
  return games.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    status: g.status,
    teams: g.teams.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      season: t.season,
      maxRosterSize: t.maxRosterSize,
      rosterCount: t._count.members,
      pendingRequests: t._count.requests,
    })),
  }));
}
