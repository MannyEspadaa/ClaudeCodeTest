// UC-10 (FREQ36, 37, 59), UC-11 (FREQ42, 66), FREQ40/65 calendar feed.
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { ForbiddenError, NotFoundError, ServiceError } from "@/server/errors";
import * as moderation from "@/server/services/moderation-service";
import * as accounts from "@/server/services/account-service";
import * as discord from "@/server/services/discord-service";
import * as feed from "@/server/services/feed-service";
import * as schedule from "@/server/services/schedule-service";
import { createSession, validateSessionToken } from "@/server/auth/session";
import { ctxOf, joinCommunity, makeGame, makeManager, makeUser } from "./factories";
import { PASSWORD, registerVerified } from "./helpers";

process.env.DISCORD_CLIENT_ID = "client";
process.env.DISCORD_CLIENT_SECRET = "secret";

async function code(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  if (err instanceof ForbiddenError) return "FORBIDDEN";
  if (err instanceof NotFoundError) return "NOT_FOUND";
  if (err instanceof ServiceError) return err.code;
  if (err) throw err;
  return "OK";
}

describe("moderation (UC-10)", () => {
  it("suspending signs the user out and blocks login; lifting restores access", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const u = await registerVerified();
    const session = await accounts.login(u);
    await moderation.suspendUser(admin, u.id, { reason: "Toxic chat" });
    expect(await validateSessionToken(session.token)).toBeNull();
    expect(await code(accounts.login(u))).toBe("SUSPENDED");
    await moderation.liftSuspension(admin, u.id);
    await accounts.login(u);
    expect((await db.auditLog.findMany({ where: { targetId: u.id }, orderBy: { createdAt: "asc" } })).map((a) => a.action)).toEqual(["user.suspend", "user.unsuspend"]);
  });

  it("timed suspensions end on their own at next login", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const u = await registerVerified();
    await moderation.suspendUser(admin, u.id, { reason: "Cool off", until: new Date(Date.now() + 60_000) });
    const err = await accounts.login(u).catch((e) => e);
    expect(err.message).toMatch(/suspended until/);
    await db.suspension.updateMany({ data: { until: new Date(Date.now() - 1000) } });
    await accounts.login(u);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).status).toBe("ACTIVE");
  });

  it("extension: non-admins, self-moderation and the last admin are refused", async () => {
    const adminUser = await makeUser({ admin: true });
    const admin = await ctxOf(adminUser);
    const gm = await ctxOf(await makeManager((await makeGame()).id));
    const target = await makeUser();
    expect(await code(moderation.suspendUser(gm, target.id, { reason: "nope" }))).toBe("FORBIDDEN");
    expect(await code(moderation.suspendUser(admin, adminUser.id, { reason: "self" }))).toBe("SELF");
    expect(await code(moderation.suspendUser(admin, target.id, { reason: "x" }))).toBe("VALIDATION"); // reason too short
    expect(await code(moderation.suspendUser(admin, target.id, { reason: "past", until: new Date(Date.now() - 1000) }))).toBe("VALIDATION");
  });

  it("two admins suspending each other at once can't leave zero active admins", async () => {
    const a = await makeUser({ admin: true });
    const b = await makeUser({ admin: true });
    const [ca, cb] = [await ctxOf(a), await ctxOf(b)];
    const results = await Promise.all([
      code(moderation.suspendUser(ca, b.id, { reason: "race test" })),
      code(moderation.suspendUser(cb, a.id, { reason: "race test" })),
    ]);
    expect(results.sort()).toEqual(["LAST_ADMIN", "OK"]);
    expect(await db.user.count({ where: { isAdmin: true, status: "ACTIVE" } })).toBe(1);
  });

  it("removal anonymizes, frees the email and keeps authored content", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const game = await makeGame();
    const u = await registerVerified({ email: "gone@example.edu", username: "gone_user" });
    await joinCommunity(u.id, game.id);
    await db.gameManagerAssignment.create({ data: { userId: u.id, gameId: game.id } });
    const event = await schedule.createEvent(await ctxOf({ id: u.id }), game.id, { name: "Meetup", startsAt: new Date(Date.now() + 3_600_000), endsAt: new Date(Date.now() + 7_200_000) });
    await discord.linkDiscord(u.id, { id: "d1", username: "gone#1" });
    await feed.regenerateFeed(u.id);

    await moderation.removeUser(admin, u.id, { reason: "Requested deletion" });
    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after).toMatchObject({ status: "REMOVED", fullName: "Removed user", isAdmin: false });
    expect(after.email).not.toContain("gone@");
    expect(await db.communityMembership.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.gameManagerAssignment.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.discordLink.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).createdById).toBe(u.id);
    expect(await accounts.getPublicProfile("gone_user", { includePii: true })).toBeNull();
    await accounts.register({ email: "gone@example.edu", fullName: "New Person", username: "gone_user", password: PASSWORD });
  });
});

describe("Discord (UC-11)", () => {
  function fakeDiscord(identity: { id: string; username: string } | "reject"): typeof fetch {
    return (async (url: string | URL | Request) => {
      const u = String(url);
      if (identity === "reject") return new Response("{}", { status: 400 });
      if (u.endsWith("/oauth2/token")) return Response.json({ access_token: "tok" });
      if (u.endsWith("/users/@me")) return Response.json(identity);
      return new Response("", { status: 404 });
    }) as typeof fetch;
  }

  it("links, prevents linking one Discord account to two users, and unlinks", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await discord.linkDiscord(a.id, await discord.fetchDiscordIdentity("code", fakeDiscord({ id: "42", username: "ace" })));
    expect(await discord.getDiscordUsername(a.id)).toBe("ace");
    expect(await code(discord.linkDiscord(b.id, { id: "42", username: "ace" }))).toBe("DISCORD_TAKEN");
    await discord.unlinkDiscord(a.id);
    expect(await discord.getDiscordUsername(a.id)).toBeNull();
  });

  it("extension: Discord authentication failure", async () => {
    expect(await code(discord.fetchDiscordIdentity("bad", fakeDiscord("reject")))).toBe("DISCORD_AUTH");
    expect(discord.discordAuthorizeUrl("st")).toContain("scope=identify");
  });
});

describe("calendar feed (FREQ40, 65)", () => {
  it("serves the user's personal calendar, including team-only items, until revoked", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const team = await db.team.create({ data: { gameId: game.id, name: "Varsity", status: "ACTIVE" } });
    const p = await makeUser();
    await joinCommunity(p.id, game.id);
    await db.teamMembership.create({ data: { teamId: team.id, userId: p.id } });
    await schedule.createScheduleEntry(gm, game.id, { type: "PRACTICE", teamId: team.id, startsAt: new Date(Date.now() + 86_400_000), endsAt: new Date(Date.now() + 90_000_000) });

    const url = await feed.regenerateFeed(p.id);
    const token = url.split("/").pop()!.replace(".ics", "");
    const ics = await feed.renderFeed(token);
    expect(ics).toContain("SUMMARY:Varsity practice");
    // regenerating invalidates the old link
    await feed.regenerateFeed(p.id);
    expect(await feed.renderFeed(token)).toBeNull();
    // suspended users' feeds stop working
    const token2 = (await feed.regenerateFeed(p.id)).split("/").pop()!.replace(".ics", "");
    await db.user.update({ where: { id: p.id }, data: { status: "SUSPENDED" } });
    expect(await feed.renderFeed(token2)).toBeNull();
    await feed.revokeFeed(p.id);
    expect(await db.calendarFeedToken.count()).toBe(0);
  });

  it("sessions for created users still work (sanity)", async () => {
    const u = await makeUser();
    const s = await createSession(u.id);
    expect((await validateSessionToken(s.token))?.id).toBe(u.id);
  });
});
