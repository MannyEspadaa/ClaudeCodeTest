// UC-9 Manage User Roles (FREQ32-34, 52, 53) with audit (NFREQ12).
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { ForbiddenError, ServiceError } from "@/server/errors";
import * as roles from "@/server/services/role-service";
import { ctxOf, makeGame, makeUser } from "./factories";

async function code(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  if (err instanceof ForbiddenError) return "FORBIDDEN";
  if (err instanceof ServiceError) return err.code;
  if (err) throw err;
  return "OK";
}

describe("roles", () => {
  it("admin assigns a GM to a game; GM gains scoped powers and joins the community", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const game = await makeGame();
    const u = await makeUser();
    await roles.assignGameManager(admin, u.id, game.id);
    const ctx = await ctxOf(u);
    expect(ctx.managedGameIds.has(game.id)).toBe(true);
    expect(ctx.communityGameIds.has(game.id)).toBe(true);
    await roles.unassignGameManager(admin, u.id, game.id);
    expect((await ctxOf(u)).managedGameIds.size).toBe(0);
    expect(await db.auditLog.findMany({ where: { targetId: u.id }, select: { action: true }, orderBy: { createdAt: "asc" } })).toEqual([
      { action: "role.gm.grant" },
      { action: "role.gm.revoke" },
    ]);
  });

  it("non-admins (including GMs) cannot manage roles", async () => {
    const game = await makeGame();
    const gm = await makeUser();
    await db.gameManagerAssignment.create({ data: { userId: gm.id, gameId: game.id } });
    const target = await makeUser();
    expect(await code(roles.assignGameManager(await ctxOf(gm), target.id, game.id))).toBe("FORBIDDEN");
    expect(await code(roles.grantAdmin(await ctxOf(gm), target.id))).toBe("FORBIDDEN");
    expect(await code(roles.listUsers(await ctxOf(gm)))).toBe("FORBIDDEN");
  });

  it("admins grant and revoke admin; cannot revoke self or the last admin", async () => {
    const a1 = await makeUser({ admin: true });
    const u = await makeUser();
    await roles.grantAdmin(await ctxOf(a1), u.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).isAdmin).toBe(true);
    expect(await code(roles.revokeAdmin(await ctxOf(a1), a1.id))).toBe("SELF_REVOKE");
    await roles.revokeAdmin(await ctxOf(u), a1.id);
    // u is now the only admin and cannot be revoked by anyone (only u is admin, and self-revoke is blocked)
    expect(await code(roles.revokeAdmin(await ctxOf(u), u.id))).toBe("SELF_REVOKE");
  });

  it("last-admin rule holds when two admins revoke each other at once", async () => {
    const a = await makeUser({ admin: true });
    const b = await makeUser({ admin: true });
    const [ca, cb] = [await ctxOf(a), await ctxOf(b)];
    const results = await Promise.all([code(roles.revokeAdmin(ca, b.id)), code(roles.revokeAdmin(cb, a.id))]);
    expect(results.sort()).toEqual(["LAST_ADMIN", "OK"]);
    expect(await db.user.count({ where: { isAdmin: true } })).toBe(1);
  });

  it("cannot grant roles to suspended or unverified users", async () => {
    const admin = await ctxOf(await makeUser({ admin: true }));
    const game = await makeGame();
    const s = await makeUser();
    await db.user.update({ where: { id: s.id }, data: { status: "SUSPENDED" } });
    expect(await code(roles.assignGameManager(admin, s.id, game.id))).toBe("USER_INACTIVE");
    const unv = await makeUser();
    await db.user.update({ where: { id: unv.id }, data: { emailVerifiedAt: null } });
    expect(await code(roles.grantAdmin(admin, unv.id))).toBe("NOT_VERIFIED");
  });

  it("lists and searches users", async () => {
    const admin = await ctxOf(await makeUser({ admin: true, username: "boss" }));
    await makeUser({ username: "zed_player" });
    const res = await roles.listUsers(admin, { q: "ZED" });
    expect(res.users.map((u) => u.username)).toEqual(["zed_player"]);
  });
});
