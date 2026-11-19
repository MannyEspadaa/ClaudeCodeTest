// UC-6, UC-7, FREQ20/22/26-28/44/50/51/55-58 and their extensions.
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { ForbiddenError, NotFoundError, ServiceError } from "@/server/errors";
import * as games from "@/server/services/game-service";
import * as community from "@/server/services/community-service";
import * as teams from "@/server/services/team-service";
import * as roster from "@/server/services/roster-service";
import { ctxOf, joinCommunity, makeGame, makeManager, makeUser } from "./factories";

async function code(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  if (err instanceof ForbiddenError) return "FORBIDDEN";
  if (err instanceof ServiceError) return err.code;
  if (err) throw err;
  return "OK";
}

describe("games (FREQ50)", () => {
  it("admins create, rename and archive games; others cannot", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const user = await ctxOf(await makeUser());
    const game = await games.createGame(admin, { name: "Rocket Arena" });
    expect(game.slug).toBe("rocket-arena");
    expect(await code(games.createGame(admin, { name: "Rocket Arena" }))).toBe("GAME_NAME_TAKEN");
    expect(await code(games.createGame(user, { name: "Nope" }))).toBe("FORBIDDEN");
    const renamed = await games.renameGame(admin, game.id, { name: "Rocket Arena 2" });
    expect(renamed.slug).toBe("rocket-arena");
    await games.setGameArchived(admin, game.id, true);
    expect(await code(community.joinCommunity(user, game.id))).toBe("GAME_ARCHIVED");
  });
});

describe("communities (FREQ51)", () => {
  it("users join and leave; leaving removes them from that game's teams and cancels requests", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const u = await makeUser();
    await community.joinCommunity(await ctxOf(u), game.id);
    const t1 = await teams.createTeam(gm, game.id, { name: "Varsity" });
    const t2 = await teams.createTeam(gm, game.id, { name: "JV" });
    await roster.addPlayer(gm, t1.id, u.id);
    await roster.requestToJoin(await ctxOf(u), t2.id);

    const page = await community.getCommunityPage(await ctxOf(u), game.slug);
    expect(page.teams.find((t) => t.id === t1.id)?.isOnTeam).toBe(true);
    expect(page.teams.find((t) => t.id === t2.id)?.pendingRequestId).toBeTruthy();

    expect(await community.leaveCommunity(await ctxOf(u), game.id)).toEqual({ teamsLeft: 1 });
    expect(await db.teamMembership.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.rosterRequest.count({ where: { userId: u.id, status: "PENDING" } })).toBe(0);
  });

  it("non-members see the community header but not its teams", async () => {
    const game = await makeGame();
    const outsider = await ctxOf(await makeUser());
    const page = await community.getCommunityPage(outsider, game.slug);
    expect(page.canView).toBe(false);
    expect(page.teams).toEqual([]);
  });
});

describe("teams (UC-7)", () => {
  it("GM creates a shell team; it becomes active with its first player", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const team = await teams.createTeam(gm, game.id, { name: "Varsity", maxRosterSize: "5", season: "Fall 2026" });
    expect(team).toMatchObject({ status: "SHELL", maxRosterSize: 5, season: "Fall 2026" });
    const p = await makeUser();
    await joinCommunity(p.id, game.id);
    await roster.addPlayer(gm, team.id, p.id);
    expect((await db.team.findUniqueOrThrow({ where: { id: team.id } })).status).toBe("ACTIVE");
  });

  it("extension: GM cannot manage teams outside their assigned games", async () => {
    const g1 = await makeGame();
    const g2 = await makeGame();
    const gm = await ctxOf(await makeManager(g1.id));
    expect(await code(teams.createTeam(gm, g2.id, { name: "X Team" }))).toBe("FORBIDDEN");
    const admin = await ctxOf(await makeUser({ admin: true }));
    const other = await teams.createTeam(admin, g2.id, { name: "Other" });
    expect(await code(teams.updateTeam(gm, other.id, { name: "Hijack" }))).toBe("FORBIDDEN");
    expect(await code(teams.deleteTeam(gm, other.id))).toBe("FORBIDDEN");
  });

  it("extension: invalid team information", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    expect(await code(teams.createTeam(gm, game.id, { name: "" }))).toBe("VALIDATION");
    expect(await code(teams.createTeam(gm, game.id, { name: "Ok Name", maxRosterSize: "0" }))).toBe("VALIDATION");
    await teams.createTeam(gm, game.id, { name: "Dup" });
    expect(await code(teams.createTeam(gm, game.id, { name: "Dup" }))).toBe("TEAM_NAME_TAKEN");
  });

  it("only shell teams can be deleted (FREQ28); deletion is audited", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const shell = await teams.createTeam(gm, game.id, { name: "Shell" });
    const active = await teams.createTeam(gm, game.id, { name: "Active" });
    const p = await makeUser();
    await joinCommunity(p.id, game.id);
    await roster.addPlayer(gm, active.id, p.id);
    await roster.removePlayer(gm, active.id, p.id);
    expect(await code(teams.deleteTeam(gm, active.id))).toBe("NOT_SHELL");
    await teams.deleteTeam(gm, shell.id);
    expect(await db.auditLog.count({ where: { action: "team.delete", targetId: shell.id } })).toBe(1);
  });

  it("capacity cannot be lowered below the current roster", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const team = await teams.createTeam(gm, game.id, { name: "Tm" });
    for (let i = 0; i < 2; i++) {
      const p = await makeUser();
      await joinCommunity(p.id, game.id);
      await roster.addPlayer(gm, team.id, p.id);
    }
    expect(await code(teams.updateTeam(gm, team.id, { name: "Tm", maxRosterSize: 1 }))).toBe("CAPACITY_BELOW_ROSTER");
  });

  it("archiving cancels pending requests and blocks new ones", async () => {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const team = await teams.createTeam(gm, game.id, { name: "Tm" });
    const u = await makeUser();
    await joinCommunity(u.id, game.id);
    await roster.requestToJoin(await ctxOf(u), team.id);
    await teams.setTeamArchived(gm, team.id, true);
    expect(await db.rosterRequest.count({ where: { status: "PENDING" } })).toBe(0);
    expect(await code(roster.requestToJoin(await ctxOf(u), team.id))).toBe("TEAM_ARCHIVED");
    await teams.setTeamArchived(gm, team.id, false);
    expect((await db.team.findUniqueOrThrow({ where: { id: team.id } })).status).toBe("ACTIVE");
  });
});

describe("roster requests (UC-6)", () => {
  async function setup(max?: number) {
    const game = await makeGame();
    const gm = await ctxOf(await makeManager(game.id));
    const team = await teams.createTeam(gm, game.id, { name: "Varsity", maxRosterSize: max });
    const member = await makeUser();
    await joinCommunity(member.id, game.id);
    return { game, gm, team, member };
  }

  it("main flow: request → GM approves → player on roster", async () => {
    const { gm, team, member } = await setup();
    const req = await roster.requestToJoin(await ctxOf(member), team.id);
    expect(await code(roster.requestToJoin(await ctxOf(member), team.id))).toBe("ALREADY_REQUESTED");
    const mgmt = await teams.getTeamManagement(gm, team.id);
    expect(mgmt.requests.map((r) => r.user.id)).toEqual([member.id]);
    await roster.decideRequest(gm, req.id, true);
    expect((await ctxOf(member)).teamIds.has(team.id)).toBe(true);
    expect(await code(roster.decideRequest(gm, req.id, true))).toBe("ALREADY_DECIDED");
  });

  it("GM can deny; member can cancel their own request", async () => {
    const { gm, team, member } = await setup();
    const r1 = await roster.requestToJoin(await ctxOf(member), team.id);
    await roster.decideRequest(gm, r1.id, false);
    expect((await ctxOf(member)).teamIds.has(team.id)).toBe(false);
    const r2 = await roster.requestToJoin(await ctxOf(member), team.id);
    const other = await ctxOf(await makeUser());
    await expect(roster.cancelRequest(other, r2.id)).rejects.toThrow(NotFoundError);
    await roster.cancelRequest(await ctxOf(member), r2.id);
    expect((await db.rosterRequest.findUniqueOrThrow({ where: { id: r2.id } })).status).toBe("CANCELLED");
  });

  it("extension: roster capacity reached", async () => {
    const { game, gm, team, member } = await setup(1);
    const first = await makeUser();
    await joinCommunity(first.id, game.id);
    const req = await roster.requestToJoin(await ctxOf(member), team.id);
    await roster.addPlayer(gm, team.id, first.id);
    expect(await code(roster.decideRequest(gm, req.id, true))).toBe("ROSTER_FULL");
    const late = await makeUser();
    await joinCommunity(late.id, game.id);
    expect(await code(roster.requestToJoin(await ctxOf(late), team.id))).toBe("ROSTER_FULL");
  });

  it("concurrent approvals never overfill a roster", async () => {
    const { game, gm, team } = await setup(1);
    const reqs = [];
    for (let i = 0; i < 4; i++) {
      const u = await makeUser();
      await joinCommunity(u.id, game.id);
      reqs.push(await roster.requestToJoin(await ctxOf(u), team.id));
    }
    const results = await Promise.all(reqs.map((r) => code(roster.decideRequest(gm, r.id, true))));
    expect(results.filter((r) => r === "OK")).toHaveLength(1);
    expect(await db.teamMembership.count({ where: { teamId: team.id } })).toBe(1);
  });

  it("extension: non-community members cannot request or be added", async () => {
    const { gm, team } = await setup();
    const outsider = await makeUser();
    expect(await code(roster.requestToJoin(await ctxOf(outsider), team.id))).toBe("FORBIDDEN");
    expect(await code(roster.addPlayer(gm, team.id, outsider.id))).toBe("NOT_COMMUNITY_MEMBER");
  });

  it("player leaves immediately (FREQ22) and returns to community member", async () => {
    const { gm, team, member } = await setup();
    await roster.addPlayer(gm, team.id, member.id);
    await roster.leaveTeam(await ctxOf(member), team.id);
    const ctx = await ctxOf(member);
    expect(ctx.teamIds.size).toBe(0);
    expect(ctx.communityGameIds.has(team.gameId)).toBe(true);
  });

  it("team page is visible to its players and GM only", async () => {
    const { game, gm, team, member } = await setup();
    await roster.addPlayer(gm, team.id, member.id);
    const page = await teams.getTeamPage(await ctxOf(member), team.id);
    expect(page.roster.map((r) => r.userId)).toEqual([member.id]);
    expect(page.roster[0].name).not.toContain(" "); // first name only for players
    expect((await teams.getTeamPage(gm, team.id)).roster[0].name).toContain(" ");
    const cm = await makeUser();
    await joinCommunity(cm.id, game.id);
    expect(await code(teams.getTeamPage(await ctxOf(cm), team.id))).toBe("FORBIDDEN");
  });
});
