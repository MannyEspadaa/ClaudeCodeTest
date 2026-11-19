// FREQ50: Admins manage games (each game has one Game Community).
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { slugify } from "@/server/validation/common";

const gameSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60, "Name must be at most 60 characters."),
});

const NAME_TAKEN = () => new ServiceError("GAME_NAME_TAKEN", "A game with that name already exists.", { name: ["A game with that name already exists."] });

export async function listGames(actor: AuthzContext, opts: { includeArchived?: boolean } = {}) {
  const games = await db.game.findMany({
    where: opts.includeArchived && actor.isAdmin ? {} : { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, teams: true } } },
  });
  return games.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    status: g.status,
    memberCount: g._count.members,
    teamCount: g._count.teams,
    isMember: actor.communityGameIds.has(g.id),
    isManager: actor.managedGameIds.has(g.id),
  }));
}

export async function getGameBySlug(slug: string) {
  const game = await db.game.findUnique({ where: { slug } });
  if (!game) throw new NotFoundError("Game not found.");
  return game;
}

export async function requireGame(gameId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new NotFoundError("Game not found.");
  return game;
}

export async function createGame(actor: AuthzContext, input: unknown) {
  authorize(actor, "games.manage", { type: "global" });
  const { name } = parseOrThrow(gameSchema, input);
  const base = slugify(name) || "game";
  let slug = base;
  for (let i = 2; await db.game.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  try {
    const game = await db.game.create({ data: { name, slug } });
    await recordAudit({ actorId: actor.userId, action: "game.create", targetType: "game", targetId: game.id, details: { name } });
    return game;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw NAME_TAKEN();
    throw err;
  }
}

/** Renames keep the slug so links stay valid. */
export async function renameGame(actor: AuthzContext, gameId: string, input: unknown) {
  authorize(actor, "games.manage", { type: "global" });
  const { name } = parseOrThrow(gameSchema, input);
  await requireGame(gameId);
  try {
    return await db.game.update({ where: { id: gameId }, data: { name } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw NAME_TAKEN();
    throw err;
  }
}

/** Archived games are read-only: no joins, no new teams, no roster changes. */
export async function setGameArchived(actor: AuthzContext, gameId: string, archived: boolean) {
  authorize(actor, "games.manage", { type: "global" });
  await requireGame(gameId);
  const game = await db.game.update({ where: { id: gameId }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
  await recordAudit({ actorId: actor.userId, action: archived ? "game.archive" : "game.unarchive", targetType: "game", targetId: gameId });
  return game;
}

export function assertGameActive(game: { status: string }) {
  if (game.status !== "ACTIVE") throw new ServiceError("GAME_ARCHIVED", "This game is archived and read-only.");
}
