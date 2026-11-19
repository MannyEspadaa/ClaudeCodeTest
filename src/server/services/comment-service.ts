// FREQ31: GMs analyze VODs and stats with comments; FREQ62: Players reply (one level).
import type { CommentTarget } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { can, type AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { teamWith } from "./team-data-common";
import { teamResource } from "./team-service";

const bodySchema = z.object({ body: z.string().trim().min(1, "Write a comment.").max(4000, "Comment is too long.") });

async function targetTeamId(targetType: CommentTarget, targetId: string): Promise<string> {
  const row =
    targetType === "VOD"
      ? await db.vod.findUnique({ where: { id: targetId }, select: { teamId: true } })
      : await db.statSheet.findUnique({ where: { id: targetId }, select: { teamId: true } });
  if (!row) throw new NotFoundError("Not found.");
  return row.teamId;
}

export async function addComment(actor: AuthzContext, targetType: CommentTarget, targetId: string, input: unknown, parentId?: string | null) {
  const teamId = await targetTeamId(targetType, targetId);
  if (parentId) {
    // Replies: Players on the team and its managers.
    await teamWith(actor, teamId, "teamData.reply");
    const parent = await db.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.targetId !== targetId || parent.targetType !== targetType) throw new NotFoundError("Comment not found.");
    if (parent.parentId) throw new ServiceError("NESTING", "Reply to the original comment instead.");
  } else {
    // New analysis threads: Game Managers / Admins.
    await teamWith(actor, teamId, "teamData.manage");
  }
  const { body } = parseOrThrow(bodySchema, input);
  return db.comment.create({ data: { teamId, targetType, targetId, parentId: parentId || null, authorId: actor.userId, body } });
}

export async function deleteComment(actor: AuthzContext, commentId: string) {
  const c = await db.comment.findUnique({ where: { id: commentId }, include: { team: true } });
  if (!c) throw new NotFoundError("Comment not found.");
  const isAuthor = c.authorId === actor.userId;
  if (!isAuthor) await teamWith(actor, c.teamId, "teamData.manage");
  else await teamWith(actor, c.teamId, "teamData.view");
  await db.comment.delete({ where: { id: commentId } });
}

export async function listComments(actor: AuthzContext, targetType: CommentTarget, targetId: string) {
  const teamId = await targetTeamId(targetType, targetId);
  const team = await teamWith(actor, teamId, "teamData.view");
  const rows = await db.comment.findMany({
    where: { targetType, targetId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { username: true, id: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { username: true, id: true } } } },
    },
  });
  const res = teamResource(team);
  return {
    canStart: can(actor, "teamData.manage", res),
    canReply: can(actor, "teamData.reply", res),
    canModerate: can(actor, "teamData.manage", res),
    threads: rows,
  };
}
