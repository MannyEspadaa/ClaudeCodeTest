// UC-4, UC-5, UC-12; FREQ11-19, 38, 54, 60, 63, 64; visibility rules (C5).
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { ForbiddenError, NotFoundError, ServiceError } from "@/server/errors";
import * as schedule from "@/server/services/schedule-service";
import * as calendar from "@/server/services/calendar-service";
import * as announcements from "@/server/services/announcement-service";
import { ctxOf, joinCommunity, makeGame, makeManager, makeUser } from "./factories";

async function code(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  if (err instanceof ForbiddenError) return "FORBIDDEN";
  if (err instanceof NotFoundError) return "NOT_FOUND";
  if (err instanceof ServiceError) return err.code;
  if (err) throw err;
  return "OK";
}

const day = 86_400_000;
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 3_600_000);
const window = { from: new Date(Date.now() - day), to: new Date(Date.now() + 30 * day) };

async function world() {
  const game = await makeGame();
  const other = await makeGame();
  const gmUser = await makeManager(game.id);
  const gm = await ctxOf(gmUser);
  const team = await db.team.create({ data: { gameId: game.id, name: "Varsity", status: "ACTIVE" } });
  const player = await makeUser();
  await joinCommunity(player.id, game.id);
  await db.teamMembership.create({ data: { teamId: team.id, userId: player.id } });
  const member = await makeUser();
  await joinCommunity(member.id, game.id);
  const admin = await ctxOf(await makeUser({ admin: true }));
  return { game, other, gm, team, player: await ctxOf(player), member: await ctxOf(member), admin };
}

describe("events (UC-4)", () => {
  it("GM manages events for their game only; global events are admin-only", async () => {
    const w = await world();
    const ev = await schedule.createEvent(w.gm, w.game.id, { name: "Watch party", location: "Union 101", startsAt: at(2), endsAt: at(4) });
    expect(ev.visibility).toBe("PUBLIC");
    await schedule.updateEvent(w.gm, ev.id, { name: "Watch party (moved)", startsAt: at(3), endsAt: at(5), visibility: "MEMBERS" });
    expect((await db.event.findUniqueOrThrow({ where: { id: ev.id } })).name).toBe("Watch party (moved)");
    expect(await code(schedule.createEvent(w.gm, w.other.id, { name: "X", startsAt: at(1), endsAt: at(2) }))).toBe("FORBIDDEN");
    expect(await code(schedule.createEvent(w.gm, null, { name: "Global", startsAt: at(1), endsAt: at(2) }))).toBe("FORBIDDEN");
    expect(await code(schedule.createEvent(w.member, w.game.id, { name: "X", startsAt: at(1), endsAt: at(2) }))).toBe("FORBIDDEN");
    await schedule.createEvent(w.admin, null, { name: "Tryouts", startsAt: at(1), endsAt: at(2) });
    await schedule.deleteEvent(w.gm, ev.id);
    expect(await db.event.count({ where: { id: ev.id } })).toBe(0);
  });

  it("extension: invalid event information", async () => {
    const w = await world();
    expect(await code(schedule.createEvent(w.gm, w.game.id, { name: "", startsAt: at(2), endsAt: at(1) }))).toBe("VALIDATION");
    const err = await schedule.createEvent(w.gm, w.game.id, { name: "Ok", startsAt: at(2), endsAt: at(1) }).catch((e) => e);
    expect(err.fieldErrors.endsAt).toEqual(["End must be after start."]);
    expect(await code(schedule.createEvent(w.gm, w.game.id, { name: "Ok", startsAt: "garbage", endsAt: at(1) }))).toBe("VALIDATION");
  });
});

describe("schedules (UC-5)", () => {
  it("defaults visibility by type and detects team conflicts (FREQ60)", async () => {
    const w = await world();
    const match = await schedule.createScheduleEntry(w.gm, w.game.id, { type: "MATCH", teamId: w.team.id, opponent: "State", startsAt: at(10), endsAt: at(12) });
    expect(match.visibility).toBe("PUBLIC");
    const err = await schedule
      .createScheduleEntry(w.gm, w.game.id, { type: "PRACTICE", teamId: w.team.id, startsAt: at(11), endsAt: at(13) })
      .catch((e) => e);
    expect(err.code).toBe("SCHEDULE_CONFLICT");
    expect(err.message).toContain("Varsity match vs State");
    const practice = await schedule.createScheduleEntry(w.gm, w.game.id, { type: "PRACTICE", teamId: w.team.id, startsAt: at(11), endsAt: at(13), allowConflict: "on" });
    expect(practice.visibility).toBe("TEAM");
    // Touching edges are not conflicts; editing an entry doesn't conflict with itself.
    await schedule.createScheduleEntry(w.gm, w.game.id, { type: "SCRIM", teamId: w.team.id, startsAt: at(13), endsAt: at(14) });
    await schedule.updateScheduleEntry(w.gm, match.id, { type: "MATCH", teamId: w.team.id, opponent: "State", startsAt: at(9), endsAt: at(11), allowConflict: true });
  });

  it("team-only entries need a team from the same game; practices without a team default to members", async () => {
    const w = await world();
    expect(await code(schedule.createScheduleEntry(w.gm, w.game.id, { type: "OTHER", visibility: "TEAM", startsAt: at(1), endsAt: at(2) }))).toBe("VALIDATION");
    const foreign = await db.team.create({ data: { gameId: w.other.id, name: "Other" } });
    expect(await code(schedule.createScheduleEntry(w.gm, w.game.id, { type: "MATCH", teamId: foreign.id, startsAt: at(1), endsAt: at(2) }))).toBe("VALIDATION");
    const e = await schedule.createScheduleEntry(w.gm, w.game.id, { type: "PRACTICE", startsAt: at(1), endsAt: at(2) });
    expect(e.visibility).toBe("MEMBERS");
  });

  it("only the game's GM or an admin can manage its schedule", async () => {
    const w = await world();
    expect(await code(schedule.createScheduleEntry(w.player, w.game.id, { type: "MATCH", startsAt: at(1), endsAt: at(2) }))).toBe("FORBIDDEN");
    const otherGm = await ctxOf(await makeManager(w.other.id));
    expect(await code(schedule.createScheduleEntry(otherGm, w.game.id, { type: "MATCH", startsAt: at(1), endsAt: at(2) }))).toBe("FORBIDDEN");
  });
});

describe("calendar visibility (C5, FREQ18, 19, 38, NFREQ8)", () => {
  async function seeded() {
    const w = await world();
    await schedule.createEvent(w.gm, w.game.id, { name: "Public event", startsAt: at(1), endsAt: at(2) });
    await schedule.createEvent(w.gm, w.game.id, { name: "Members event", startsAt: at(3), endsAt: at(4), visibility: "MEMBERS" });
    await schedule.createScheduleEntry(w.gm, w.game.id, { type: "MATCH", teamId: w.team.id, opponent: "Tech", startsAt: at(5), endsAt: at(6) });
    await schedule.createScheduleEntry(w.gm, w.game.id, { type: "PRACTICE", teamId: w.team.id, startsAt: at(7), endsAt: at(8) });
    const otherGm = await ctxOf(await makeManager(w.other.id));
    await schedule.createEvent(otherGm, w.other.id, { name: "Other game event", startsAt: at(9), endsAt: at(10) });
    return w;
  }
  const titles = (items: calendar.CalendarItem[]) => items.map((i) => i.title);

  it("logged-out visitors see only public items", async () => {
    await seeded();
    expect(titles(await calendar.listCalendarItems(null, window))).toEqual(["Public event", "Varsity match vs Tech", "Other game event"]);
  });

  it("logged-in users see members items; team-only items only for that team, its GM and admins", async () => {
    const w = await seeded();
    const outsider = await ctxOf(await makeUser());
    expect(titles(await calendar.listCalendarItems(outsider, window))).not.toContain("Varsity practice");
    expect(titles(await calendar.listCalendarItems(outsider, window))).toContain("Members event");
    expect(titles(await calendar.listCalendarItems(w.member, window))).not.toContain("Varsity practice");
    for (const who of [w.player, w.gm, w.admin]) {
      expect(titles(await calendar.listCalendarItems(who, window))).toContain("Varsity practice");
    }
  });

  it("personal calendar (FREQ38) shows only the user's games and global events", async () => {
    const w = await seeded();
    await schedule.createEvent(w.admin, null, { name: "Global tryouts", startsAt: at(11), endsAt: at(12) });
    const mine = titles(await calendar.listCalendarItems(w.player, { ...window, mine: true }));
    expect(mine).toContain("Global tryouts");
    expect(mine).toContain("Varsity practice");
    expect(mine).not.toContain("Other game event");
  });

  it("item details respect visibility without revealing existence", async () => {
    const w = await seeded();
    const practice = await db.scheduleEntry.findFirstOrThrow({ where: { type: "PRACTICE" } });
    expect(await code(calendar.getCalendarItem(w.member, "schedule", practice.id))).toBe("NOT_FOUND");
    expect((await calendar.getCalendarItem(w.player, "schedule", practice.id)).canEdit).toBe(false);
    expect((await calendar.getCalendarItem(w.gm, "schedule", practice.id)).canEdit).toBe(true);
    const membersEvent = await db.event.findFirstOrThrow({ where: { name: "Members event" } });
    expect(await code(calendar.getCalendarItem(null, "event", membersEvent.id))).toBe("NOT_FOUND");
  });
});

describe("announcements (FREQ63)", () => {
  it("GMs post to their game, admins post globally; members see global + their games", async () => {
    const w = await world();
    await announcements.postAnnouncement(w.gm, w.game.id, { title: "Tryouts Friday", body: "Bring a headset." });
    await announcements.postAnnouncement(w.admin, null, { title: "Welcome", body: "Season starts soon." });
    const otherGm = await ctxOf(await makeManager(w.other.id));
    await announcements.postAnnouncement(otherGm, w.other.id, { title: "Other news", body: "x" });
    expect(await code(announcements.postAnnouncement(w.gm, null, { title: "x", body: "y" }))).toBe("FORBIDDEN");
    expect(await code(announcements.postAnnouncement(w.member, w.game.id, { title: "x", body: "y" }))).toBe("FORBIDDEN");
    const seen = (await announcements.listAnnouncements(w.member)).map((a) => a.title);
    expect(seen.sort()).toEqual(["Tryouts Friday", "Welcome"]);
  });
});
