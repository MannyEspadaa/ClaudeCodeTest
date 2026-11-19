// UC-4 Create and Manage Events (FREQ11-13, 15, 54) and UC-5 Game Schedules (FREQ16, 17, 60).
import type { Prisma, ScheduleEntry, ScheduleType, Visibility } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { optionalText } from "@/server/validation/common";
import { localDateTime, timeOrder } from "@/server/validation/datetime";
import { formatDateTime } from "@/lib/time";
import { assertGameActive, requireGame } from "./game-service";

export const CALENDAR_TAG = "calendar";

/** Public calendar is cached (NFREQ8); any change invalidates it. Safe outside a Next request (tests, scripts). */
export function invalidateCalendar() {
  try {
    revalidateTag(CALENDAR_TAG);
  } catch {
    /* not inside a Next.js request */
  }
}

// ─────────── Events ───────────

const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(100, "Name must be at most 100 characters."),
    description: optionalText(2000),
    location: optionalText(120),
    startsAt: localDateTime("Start"),
    endsAt: localDateTime("End"),
    visibility: z.enum(["PUBLIC", "MEMBERS"], { message: "Choose who can see this event." }).default("PUBLIC"),
  })
  .superRefine(timeOrder);

function authorizeEventScope(actor: AuthzContext, gameId: string | null) {
  if (gameId) authorize(actor, "event.manageGame", { type: "game", gameId });
  else authorize(actor, "event.manageGlobal", { type: "global" });
}

export async function createEvent(actor: AuthzContext, gameId: string | null, input: unknown) {
  authorizeEventScope(actor, gameId);
  if (gameId) assertGameActive(await requireGame(gameId));
  const data = parseOrThrow(eventSchema, input);
  const event = await db.event.create({ data: { ...data, gameId, createdById: actor.userId } });
  invalidateCalendar();
  return event;
}

export async function requireEvent(id: string) {
  const event = await db.event.findUnique({ where: { id }, include: { game: true } });
  if (!event) throw new NotFoundError("Event not found.");
  return event;
}

export async function updateEvent(actor: AuthzContext, id: string, input: unknown) {
  const event = await requireEvent(id);
  authorizeEventScope(actor, event.gameId);
  const data = parseOrThrow(eventSchema, input);
  const updated = await db.event.update({ where: { id }, data });
  invalidateCalendar();
  return updated;
}

export async function deleteEvent(actor: AuthzContext, id: string) {
  const event = await requireEvent(id);
  authorizeEventScope(actor, event.gameId);
  await db.event.delete({ where: { id } });
  invalidateCalendar();
}

// ─────────── Schedule entries ───────────

export const DEFAULT_VISIBILITY: Record<ScheduleType, Visibility> = {
  MATCH: "PUBLIC",
  SCRIM: "TEAM",
  PRACTICE: "TEAM",
  OTHER: "MEMBERS",
};

const scheduleSchema = z
  .object({
    type: z.enum(["MATCH", "SCRIM", "PRACTICE", "OTHER"], { message: "Choose a type." }),
    title: z.string().trim().max(100, "Title must be at most 100 characters.").optional().default(""),
    teamId: z.string().trim().optional().transform((v) => v || null),
    opponent: optionalText(80),
    location: optionalText(120),
    startsAt: localDateTime("Start"),
    endsAt: localDateTime("End"),
    visibility: z
      .enum(["DEFAULT", "PUBLIC", "MEMBERS", "TEAM"])
      .optional()
      .transform((v) => (v && v !== "DEFAULT" ? v : null)),
    result: optionalText(80),
    allowConflict: z.union([z.boolean(), z.string()]).optional().transform((v) => v === true || v === "on" || v === "true"),
  })
  .superRefine(timeOrder);

const TYPE_LABEL: Record<ScheduleType, string> = { MATCH: "Match", SCRIM: "Scrim", PRACTICE: "Practice", OTHER: "Session" };

export function scheduleTitle(e: { type: ScheduleType; title: string; opponent: string | null; team?: { name: string } | null }) {
  if (e.title) return e.title;
  const base = e.team ? `${e.team.name} ${TYPE_LABEL[e.type].toLowerCase()}` : TYPE_LABEL[e.type];
  return e.opponent ? `${base} vs ${e.opponent}` : base;
}

/** FREQ60: entries of the same team that overlap [startsAt, endsAt). */
export async function findConflicts(teamId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  return db.scheduleEntry.findMany({
    where: { teamId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    include: { team: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
}

async function prepareEntry(actor: AuthzContext, gameId: string, input: unknown, excludeId?: string) {
  authorize(actor, "schedule.manage", { type: "game", gameId });
  assertGameActive(await requireGame(gameId));
  const { allowConflict, ...data } = parseOrThrow(scheduleSchema, input);
  if (data.teamId) {
    const team = await db.team.findUnique({ where: { id: data.teamId } });
    if (!team || team.gameId !== gameId) throw new ServiceError("VALIDATION", "Choose a team from this game.", { teamId: ["Choose a team from this game."] });
  }
  // Practices/scrims default to team-only, which needs a team; without one they fall back to members.
  const fallback = DEFAULT_VISIBILITY[data.type];
  const visibility = data.visibility ?? (fallback === "TEAM" && !data.teamId ? "MEMBERS" : fallback);
  if (visibility === "TEAM" && !data.teamId) {
    throw new ServiceError("VALIDATION", "Team-only entries need a team.", { visibility: ["Team-only entries need a team."] });
  }
  if (data.teamId && !allowConflict) {
    const conflicts = await findConflicts(data.teamId, data.startsAt, data.endsAt, excludeId);
    if (conflicts.length) {
      const list = conflicts.map((c) => `${scheduleTitle(c)} (${formatDateTime(c.startsAt)})`).join("; ");
      throw new ServiceError("SCHEDULE_CONFLICT", `This overlaps with: ${list}. Tick “Save anyway” to keep both.`);
    }
  }
  return { ...data, visibility } satisfies Partial<Prisma.ScheduleEntryUncheckedCreateInput>;
}

export async function createScheduleEntry(actor: AuthzContext, gameId: string, input: unknown) {
  const data = await prepareEntry(actor, gameId, input);
  const entry = await db.scheduleEntry.create({ data: { ...data, gameId, createdById: actor.userId } });
  invalidateCalendar();
  return entry;
}

export async function requireScheduleEntry(id: string) {
  const entry = await db.scheduleEntry.findUnique({ where: { id }, include: { game: true, team: true } });
  if (!entry) throw new NotFoundError("Schedule entry not found.");
  return entry;
}

export async function updateScheduleEntry(actor: AuthzContext, id: string, input: unknown): Promise<ScheduleEntry> {
  const entry = await requireScheduleEntry(id);
  const data = await prepareEntry(actor, entry.gameId, input, id);
  const updated = await db.scheduleEntry.update({ where: { id }, data });
  invalidateCalendar();
  return updated;
}

export async function deleteScheduleEntry(actor: AuthzContext, id: string) {
  const entry = await requireScheduleEntry(id);
  authorize(actor, "schedule.manage", { type: "game", gameId: entry.gameId });
  await db.scheduleEntry.delete({ where: { id } });
  invalidateCalendar();
}
