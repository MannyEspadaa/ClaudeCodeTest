// Read side of events and schedules: FREQ18, 19, 38 and the public calendar (NFREQ8).
import type { Prisma, ScheduleType, Visibility } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { can, type Actor } from "@/server/authz/policy";
import { NotFoundError } from "@/server/errors";
import { CALENDAR_TAG, scheduleTitle } from "./schedule-service";

export type CalendarItem = {
  kind: "event" | "schedule";
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  visibility: Visibility;
  type: ScheduleType | null;
  game: { id: string; name: string; slug: string } | null;
  team: { id: string; name: string } | null;
};

export type CalendarQuery = {
  from: Date;
  to: Date;
  /** Only items for the actor's own games/teams plus global events (FREQ38 personal calendar). */
  mine?: boolean;
  gameId?: string;
  teamId?: string;
  limit?: number;
};

/** Visibility filter for schedule entries (baseline C5 / FREQ64). */
function scheduleVisibility(actor: Actor): Prisma.ScheduleEntryWhereInput {
  if (!actor || actor.status !== "ACTIVE") return { visibility: "PUBLIC" };
  if (actor.isAdmin) return {};
  return {
    OR: [
      { visibility: { in: ["PUBLIC", "MEMBERS"] } },
      { visibility: "TEAM", teamId: { in: [...actor.teamIds] } },
      { visibility: "TEAM", gameId: { in: [...actor.managedGameIds] } },
    ],
  };
}

function eventVisibility(actor: Actor): Prisma.EventWhereInput {
  return actor && actor.status === "ACTIVE" ? {} : { visibility: "PUBLIC" };
}

function myGameIds(actor: Actor): string[] {
  return actor ? [...new Set([...actor.communityGameIds, ...actor.managedGameIds])] : [];
}

const gameSelect = { select: { id: true, name: true, slug: true } } as const;

export async function listCalendarItems(actor: Actor, q: CalendarQuery): Promise<CalendarItem[]> {
  const range = { startsAt: { lt: q.to }, endsAt: { gt: q.from } };
  const mine = q.mine && actor && !actor.isAdmin;

  const scheduleWhere: Prisma.ScheduleEntryWhereInput = {
    AND: [
      range,
      scheduleVisibility(actor),
      q.gameId ? { gameId: q.gameId } : {},
      q.teamId ? { teamId: q.teamId } : {},
      mine ? { OR: [{ gameId: { in: myGameIds(actor) } }, { teamId: { in: [...actor!.teamIds] } }] } : {},
    ],
  };
  const eventWhere: Prisma.EventWhereInput | null = q.teamId
    ? null
    : {
        AND: [
          range,
          eventVisibility(actor),
          q.gameId ? { gameId: q.gameId } : {},
          mine ? { OR: [{ gameId: null }, { gameId: { in: myGameIds(actor) } }] } : {},
        ],
      };

  const take = q.limit;
  const [entries, events] = await Promise.all([
    db.scheduleEntry.findMany({
      where: scheduleWhere,
      include: { game: gameSelect, team: { select: { id: true, name: true } } },
      orderBy: { startsAt: "asc" },
      take,
    }),
    eventWhere ? db.event.findMany({ where: eventWhere, include: { game: gameSelect }, orderBy: { startsAt: "asc" }, take }) : [],
  ]);

  const items: CalendarItem[] = [
    ...events.map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.name,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      location: e.location,
      visibility: e.visibility,
      type: null,
      game: e.game,
      team: null,
    })),
    ...entries.map((e) => ({
      kind: "schedule" as const,
      id: e.id,
      title: scheduleTitle(e),
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      location: e.location,
      visibility: e.visibility,
      type: e.type,
      game: e.game,
      team: e.team,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return take ? items.slice(0, take) : items;
}

const PUBLIC_DAYS = 30;

/**
 * NFREQ8: upcoming public items for logged-out visitors, cached for 5 minutes and
 * invalidated on every calendar change. Dates are serialized by the cache, so revive them.
 */
const cachedPublicUpcoming = unstable_cache(
  async (dayKey: string) => {
    void dayKey; // part of the cache key so the window moves daily
    const from = new Date();
    return listCalendarItems(null, { from, to: new Date(from.getTime() + PUBLIC_DAYS * 86_400_000), limit: 50 });
  },
  ["public-upcoming"],
  { tags: [CALENDAR_TAG], revalidate: 300 },
);

export async function getPublicUpcoming(): Promise<CalendarItem[]> {
  const items = await cachedPublicUpcoming(new Date().toISOString().slice(0, 10));
  return items
    .map((i) => ({ ...i, startsAt: new Date(i.startsAt), endsAt: new Date(i.endsAt) }))
    .filter((i) => i.endsAt.getTime() > Date.now());
}

/** Detail of a single item; NotFound when it doesn't exist or the actor may not see it (no existence leak). */
export async function getCalendarItem(actor: Actor, kind: "event" | "schedule", id: string) {
  if (kind === "event") {
    const e = await db.event.findFirst({ where: { id, ...eventVisibility(actor) }, include: { game: gameSelect, createdBy: { select: { username: true } } } });
    if (!e) throw new NotFoundError("Event not found.");
    const canEdit = e.gameId
      ? can(actor, "event.manageGame", { type: "game", gameId: e.gameId })
      : can(actor, "event.manageGlobal", { type: "global" });
    return { kind, item: e, canEdit } as const;
  }
  const e = await db.scheduleEntry.findFirst({
    where: { AND: [{ id }, scheduleVisibility(actor)] },
    include: { game: gameSelect, team: { select: { id: true, name: true } }, createdBy: { select: { username: true } } },
  });
  if (!e) throw new NotFoundError("Schedule entry not found.");
  return { kind, item: { ...e, displayTitle: scheduleTitle(e) }, canEdit: can(actor, "schedule.manage", { type: "game", gameId: e.gameId }) } as const;
}
