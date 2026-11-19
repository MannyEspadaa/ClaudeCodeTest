import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { bootstrapAdmin } from "@/server/services/admin-bootstrap";
import * as accounts from "@/server/services/account-service";
import { PASSWORD } from "./helpers";

describe("admin bootstrap", () => {
  it("creates a verified admin and records an audit entry", async () => {
    const res = await bootstrapAdmin({ email: "Root@Example.edu", fullName: "Root Admin", username: "root", password: PASSWORD });
    expect(res.created).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: "root@example.edu" } });
    expect(user.isAdmin).toBe(true);
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(await db.auditLog.count({ where: { targetId: user.id, action: "admin.bootstrap.create" } })).toBe(1);
    await accounts.login({ email: "root@example.edu", password: PASSWORD });
  });

  it("promotes an existing account", async () => {
    const { id } = await accounts.register({ email: "a@example.edu", fullName: "A B", username: "ab_c", password: PASSWORD });
    const res = await bootstrapAdmin({ email: "a@example.edu" });
    expect(res).toEqual({ userId: id, created: false });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).isAdmin).toBe(true);
  });
});
