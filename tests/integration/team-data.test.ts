// UC-8 Upload and Analyze Team Data, UC-13 View Team VODs and Statistics.
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { ForbiddenError, NotFoundError, ServiceError } from "@/server/errors";
import * as vods from "@/server/services/vod-service";
import * as stats from "@/server/services/stats-service";
import * as comments from "@/server/services/comment-service";
import { ctxOf, joinCommunity, makeGame, makeManager, makeUser } from "./factories";

async function code(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  if (err instanceof ForbiddenError) return "FORBIDDEN";
  if (err instanceof NotFoundError) return "NOT_FOUND";
  if (err instanceof ServiceError) return err.code;
  if (err) throw err;
  return "OK";
}

async function world() {
  const game = await makeGame();
  const gm = await ctxOf(await makeManager(game.id));
  const admin = await ctxOf(await makeUser({ admin: true }));
  const team = await db.team.create({ data: { gameId: game.id, name: "Varsity", status: "ACTIVE" } });
  const otherTeam = await db.team.create({ data: { gameId: game.id, name: "JV", status: "ACTIVE" } });
  const [p1, p2] = [await makeUser({ username: "alpha" }), await makeUser({ username: "bravo" })];
  for (const p of [p1, p2]) {
    await joinCommunity(p.id, game.id);
    await db.teamMembership.create({ data: { teamId: team.id, userId: p.id } });
  }
  const jvPlayer = await makeUser();
  await joinCommunity(jvPlayer.id, game.id);
  await db.teamMembership.create({ data: { teamId: otherTeam.id, userId: jvPlayer.id } });
  await stats.addTemplate(admin, game.id);
  return { game, gm, admin, team, otherTeam, p1: await ctxOf(p1), p2: await ctxOf(p2), p1Id: p1.id, p2Id: p2.id, jv: await ctxOf(jvPlayer) };
}

describe("VODs (FREQ29, 45)", () => {
  it("GM adds a VOD; teammates view it; other teams cannot", async () => {
    const w = await world();
    const vod = await vods.addVod(w.gm, w.team.id, { title: "Finals map 1", url: "https://youtu.be/dQw4w9WgXcQ" });
    expect((await vods.listVods(w.p1, w.team.id)).vods.map((v) => v.id)).toEqual([vod.id]);
    expect(await code(vods.listVods(w.jv, w.team.id))).toBe("FORBIDDEN");
    expect(await code(vods.getVod(w.jv, vod.id))).toBe("FORBIDDEN");
    expect(await code(vods.addVod(w.p1, w.team.id, { title: "x", url: "https://example.com" }))).toBe("FORBIDDEN");
  });

  it("extension: invalid link is rejected", async () => {
    const w = await world();
    expect(await code(vods.addVod(w.gm, w.team.id, { title: "x", url: "javascript:alert(1)" }))).toBe("VALIDATION");
    expect(await code(vods.addVod(w.gm, w.team.id, { title: "x", url: "not a url" }))).toBe("VALIDATION");
  });
});

describe("stat definitions (FREQ61)", () => {
  it("admin-only; formulas must reference existing inputs of the same level", async () => {
    const w = await world();
    expect(await code(stats.createDefinition(w.gm, w.game.id, { key: "x", label: "X", level: "PLAYER", kind: "INPUT" }))).toBe("FORBIDDEN");
    expect(await code(stats.createDefinition(w.admin, w.game.id, { key: "bad", label: "Bad", level: "PLAYER", kind: "DERIVED", formula: "kills / won" }))).toBe("VALIDATION");
    expect(await code(stats.createDefinition(w.admin, w.game.id, { key: "bad", label: "Bad", level: "PLAYER", kind: "DERIVED", formula: "kills +" }))).toBe("VALIDATION");
    expect(await code(stats.createDefinition(w.admin, w.game.id, { key: "kills", label: "Dup", level: "PLAYER", kind: "INPUT" }))).toBe("VALIDATION");
    const kpg = await stats.createDefinition(w.admin, w.game.id, { key: "kpg", label: "Kills/game", level: "PLAYER", kind: "DERIVED", formula: "kills / games", precision: "1" });
    expect(kpg.precision).toBe(1);
    const kills = await db.statDefinition.findFirstOrThrow({ where: { gameId: w.game.id, key: "kills" } });
    expect(await code(stats.deleteDefinition(w.admin, kills.id))).toBe("IN_USE");
  });
});

describe("stat sheets and summaries (FREQ30, 43, 46)", () => {
  it("GM enters stats; derived values computed per sheet and over totals", async () => {
    const w = await world();
    await stats.createSheet(w.gm, w.team.id, {
      title: "vs State",
      playedAt: new Date("2026-10-01T23:00:00Z"),
      team: { won: "1", score_for: "13", score_against: "9" },
      players: { [w.p1Id]: { kills: "20", deaths: "10", assists: "5" }, [w.p2Id]: { kills: "", deaths: "", assists: "" } },
    });
    const s2 = await stats.createSheet(w.gm, w.team.id, {
      title: "vs Tech",
      playedAt: new Date("2026-10-08T23:00:00Z"),
      team: { won: 0, score_for: 7, score_against: 13 },
      players: { [w.p1Id]: { kills: 10, deaths: 0, assists: 0 } },
    });

    const sheet = await stats.getSheet(w.p1, s2.id);
    expect(sheet.playerRows[0].row.kda).toBeNull(); // 10 / 0 deaths → not available
    expect(sheet.teamRow.diff).toBe(-6);

    const summary = await stats.getTeamStats(w.p2, w.team.id);
    expect(summary.teamSummary.games).toBe(2);
    expect(summary.teamSummary.totals.win_rate).toBe(50);
    expect(summary.players).toHaveLength(1); // bravo's blank line was skipped
    expect(summary.players[0]).toMatchObject({ games: 2, totals: { kills: 30, deaths: 10, kda: 3.5 } });
    expect(summary.players[0].averages.kills).toBe(15);
  });

  it("extensions: non-numbers, non-roster players, unauthorized team access", async () => {
    const w = await world();
    const err = await stats
      .createSheet(w.gm, w.team.id, { title: "x", playedAt: new Date(), team: { won: "yes" }, players: {} })
      .catch((e) => e);
    expect(err.fieldErrors["team.won"]).toEqual(["Enter a number."]);
    const jvId = [...w.jv.teamIds][0] && w.jv.userId;
    expect(await code(stats.createSheet(w.gm, w.team.id, { title: "x", playedAt: new Date(), team: {}, players: { [jvId]: { kills: 1 } } }))).toBe("VALIDATION");
    expect(await code(stats.getTeamStats(w.jv, w.team.id))).toBe("FORBIDDEN");
    expect(await code(stats.createSheet(w.p1, w.team.id, { title: "x", playedAt: new Date(), team: { won: 1 }, players: {} }))).toBe("FORBIDDEN");
  });

  it("formula changes apply to existing sheets (derived values are never stored)", async () => {
    const w = await world();
    await stats.createSheet(w.gm, w.team.id, { title: "a", playedAt: new Date(), team: {}, players: { [w.p1Id]: { kills: 6, deaths: 2, assists: 0 } } });
    const kda = await db.statDefinition.findFirstOrThrow({ where: { gameId: w.game.id, key: "kda" } });
    await stats.updateDefinition(w.admin, kda.id, { label: "K/D", formula: "kills / deaths", precision: 1 });
    expect((await stats.getTeamStats(w.p1, w.team.id)).players[0].totals.kda).toBe(3);
  });
});

describe("comments (FREQ31, 62)", () => {
  it("GM starts threads; players reply; other teams cannot read", async () => {
    const w = await world();
    const vod = await vods.addVod(w.gm, w.team.id, { title: "Scrim", url: "https://www.twitch.tv/videos/123456" });
    expect(await code(comments.addComment(w.p1, "VOD", vod.id, { body: "Top-level from player" }))).toBe("FORBIDDEN");
    const c = await comments.addComment(w.gm, "VOD", vod.id, { body: "Rotate earlier at 12:30." });
    const r = await comments.addComment(w.p1, "VOD", vod.id, { body: "Got it." }, c.id);
    expect(await code(comments.addComment(w.p2, "VOD", vod.id, { body: "nested" }, r.id))).toBe("NESTING");
    const list = await comments.listComments(w.p2, "VOD", vod.id);
    expect(list.threads[0].replies.map((x) => x.body)).toEqual(["Got it."]);
    expect(list.canStart).toBe(false);
    expect(await code(comments.listComments(w.jv, "VOD", vod.id))).toBe("FORBIDDEN");
    // authors delete their own; GM moderates
    expect(await code(comments.deleteComment(w.p2, r.id))).toBe("FORBIDDEN");
    await comments.deleteComment(w.p1, r.id);
    await comments.deleteComment(w.gm, c.id);
  });
});
