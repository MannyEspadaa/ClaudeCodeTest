import { db } from "@/server/db";
import { contextForUserId } from "@/server/authz/context";

let n = 0;

/** Fast verified user (no password hashing). */
export async function makeUser(opts: { admin?: boolean; username?: string } = {}) {
  n += 1;
  const username = opts.username ?? `user${n}`;
  return db.user.create({
    data: {
      email: `${username}@example.edu`,
      fullName: `First${n} Last${n}`,
      username,
      usernameKey: username.toLowerCase(),
      passwordHash: "not-a-real-hash",
      emailVerifiedAt: new Date(),
      isAdmin: opts.admin ?? false,
    },
  });
}

export const ctxOf = (user: { id: string }) => contextForUserId(user.id);

export async function makeGame(name = `Game ${++n}`) {
  return db.game.create({ data: { name, slug: name.toLowerCase().replace(/\s+/g, "-") } });
}

export async function joinCommunity(userId: string, gameId: string) {
  await db.communityMembership.create({ data: { userId, gameId } });
}

export async function makeManager(gameId: string) {
  const user = await makeUser();
  await db.gameManagerAssignment.create({ data: { userId: user.id, gameId } });
  return user;
}
