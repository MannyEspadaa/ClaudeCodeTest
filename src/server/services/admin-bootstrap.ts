// Baseline §3 "First admin": creates or promotes the first Administrator from the command line.
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { hashPassword } from "@/server/auth/password";
import { ServiceError } from "@/server/errors";
import { parseOrThrow } from "@/server/validation/parse";
import { registerSchema } from "@/server/validation/account";
import { z } from "zod";

const promoteSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export type BootstrapResult = { userId: string; created: boolean };

/**
 * If a user with the email exists, promote them (and mark their email verified).
 * Otherwise a full name, username and password are required to create a verified admin account.
 * The domain allowlist is intentionally not applied: the operator chooses the address.
 */
export async function bootstrapAdmin(input: {
  email: string;
  fullName?: string;
  username?: string;
  password?: string;
}): Promise<BootstrapResult> {
  const { email } = parseOrThrow(promoteSchema, input);
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.status !== "ACTIVE") throw new ServiceError("INACTIVE", "That account is suspended or removed.");
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: { isAdmin: true, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() },
      });
      await recordAudit(
        { actorId: null, action: "admin.bootstrap.promote", targetType: "user", targetId: existing.id },
        tx,
      );
    });
    return { userId: existing.id, created: false };
  }

  const data = parseOrThrow(registerSchema, input);
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        username: data.username,
        usernameKey: data.username.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        emailVerifiedAt: new Date(),
        isAdmin: true,
      },
    });
    await recordAudit({ actorId: null, action: "admin.bootstrap.create", targetType: "user", targetId: created.id }, tx);
    return created;
  });
  return { userId: user.id, created: true };
}
