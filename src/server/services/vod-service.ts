// UC-8 / UC-13: FREQ29 (GMs add VODs) and FREQ45 (Players view them).
import { z } from "zod";
import { db } from "@/server/db";
import type { AuthzContext } from "@/server/authz/policy";
import { can } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { teamWith } from "./team-data-common";
import { teamResource } from "./team-service";

const vodSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120, "Title must be at most 120 characters."),
  url: z
    .string()
    .trim()
    .max(500, "Link is too long.")
    .url("Enter a full link starting with https://")
    .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are supported."),
  scheduleEntryId: z.string().trim().optional().transform((v) => v || null),
});

export async function addVod(actor: AuthzContext, teamId: string, input: unknown) {
  await teamWith(actor, teamId, "teamData.manage");
  const data = parseOrThrow(vodSchema, input);
  if (data.scheduleEntryId) {
    const entry = await db.scheduleEntry.findUnique({ where: { id: data.scheduleEntryId } });
    if (!entry || entry.teamId !== teamId) throw new ServiceError("VALIDATION", "Choose one of this team's matches.", { scheduleEntryId: ["Choose one of this team's matches."] });
  }
  return db.vod.create({ data: { ...data, teamId, addedById: actor.userId } });
}

export async function deleteVod(actor: AuthzContext, vodId: string) {
  const vod = await db.vod.findUnique({ where: { id: vodId } });
  if (!vod) throw new NotFoundError("VOD not found.");
  await teamWith(actor, vod.teamId, "teamData.manage");
  await db.$transaction([
    db.comment.deleteMany({ where: { targetType: "VOD", targetId: vodId } }),
    db.vod.delete({ where: { id: vodId } }),
  ]);
}

export async function listVods(actor: AuthzContext, teamId: string) {
  const team = await teamWith(actor, teamId, "teamData.view");
  const vods = await db.vod.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { username: true } }, scheduleEntry: { select: { startsAt: true, opponent: true } } },
  });
  const counts = await db.comment.groupBy({ by: ["targetId"], where: { targetType: "VOD", targetId: { in: vods.map((v) => v.id) } }, _count: true });
  const countMap = new Map(counts.map((c) => [c.targetId, c._count]));
  return { team, canManage: can(actor, "teamData.manage", teamResource(team)), vods: vods.map((v) => ({ ...v, commentCount: countMap.get(v.id) ?? 0 })) };
}

export async function getVod(actor: AuthzContext, vodId: string) {
  const vod = await db.vod.findUnique({
    where: { id: vodId },
    include: { addedBy: { select: { username: true } }, scheduleEntry: { select: { startsAt: true, opponent: true } } },
  });
  if (!vod) throw new NotFoundError("VOD not found.");
  const team = await teamWith(actor, vod.teamId, "teamData.view");
  return { vod, team, canManage: can(actor, "teamData.manage", teamResource(team)) };
}

/** Matches/scrims a VOD or stat sheet can be linked to. */
export async function linkableEntries(teamId: string) {
  return db.scheduleEntry.findMany({
    where: { teamId, type: { in: ["MATCH", "SCRIM"] }, startsAt: { lt: new Date(Date.now() + 86_400_000) } },
    orderBy: { startsAt: "desc" },
    take: 30,
    select: { id: true, startsAt: true, opponent: true, type: true, title: true },
  });
}
