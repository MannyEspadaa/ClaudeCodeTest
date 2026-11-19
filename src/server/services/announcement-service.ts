// FREQ63: announcements by Admins (global) and Game Managers (their games).
import { z } from "zod";
import { db } from "@/server/db";
import { authorize } from "@/server/authz/context";
import { can, type AuthzContext } from "@/server/authz/policy";
import { NotFoundError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { requireGame } from "./game-service";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Title must be at most 120 characters."),
  body: z.string().trim().min(1, "Write something.").max(4000, "Must be at most 4000 characters."),
});

export async function postAnnouncement(actor: AuthzContext, gameId: string | null, input: unknown) {
  if (gameId) {
    authorize(actor, "announcement.postGame", { type: "game", gameId });
    await requireGame(gameId);
  } else {
    authorize(actor, "announcement.postGlobal", { type: "global" });
  }
  const data = parseOrThrow(schema, input);
  return db.announcement.create({ data: { ...data, gameId, authorId: actor.userId } });
}

export async function deleteAnnouncement(actor: AuthzContext, id: string) {
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) throw new NotFoundError("Announcement not found.");
  if (a.gameId) authorize(actor, "announcement.postGame", { type: "game", gameId: a.gameId });
  else authorize(actor, "announcement.postGlobal", { type: "global" });
  await db.announcement.delete({ where: { id } });
}

/** Global announcements plus those of the actor's games (Admins see all). */
export async function listAnnouncements(actor: AuthzContext, opts: { gameId?: string; limit?: number } = {}) {
  const myGames = [...new Set([...actor.communityGameIds, ...actor.managedGameIds])];
  const where = opts.gameId
    ? { gameId: opts.gameId }
    : actor.isAdmin
      ? {}
      : { OR: [{ gameId: null }, { gameId: { in: myGames } }] };
  if (opts.gameId && !can(actor, "community.view", { type: "game", gameId: opts.gameId })) return [];
  const rows = await db.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
    include: { game: { select: { name: true, slug: true } }, author: { select: { username: true } } },
  });
  return rows.map((a) => ({
    ...a,
    canDelete: a.gameId
      ? can(actor, "announcement.postGame", { type: "game", gameId: a.gameId })
      : can(actor, "announcement.postGlobal", { type: "global" }),
  }));
}
