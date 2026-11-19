// Direct database helpers for end-to-end setup (users are created already verified).
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

if (!process.env.DATABASE_URL?.includes("e2e")) throw new Error("e2e helpers must use the e2e database");

export const db = new PrismaClient();
export const PASSWORD = "correct-horse-battery";
let passwordHash: Promise<string> | undefined;

export const uid = () => Math.random().toString(36).slice(2, 8);

export async function seedUser(opts: { admin?: boolean; prefix?: string } = {}) {
  passwordHash ??= hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const username = `${opts.prefix ?? "u"}_${uid()}`;
  return db.user.create({
    data: {
      email: `${username.toLowerCase()}@example.edu`,
      fullName: `${opts.prefix ?? "User"} Person`,
      username,
      usernameKey: username.toLowerCase(),
      passwordHash: await passwordHash,
      emailVerifiedAt: new Date(),
      isAdmin: opts.admin ?? false,
    },
  });
}
