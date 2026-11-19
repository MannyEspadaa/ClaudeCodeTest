import { db } from "@/server/db";
import { ForbiddenError } from "@/server/errors";
import { can, type Action, type Actor, type AuthzContext, type Resource } from "./policy";

export type ContextUser = { id: string; isAdmin: boolean; status: AuthzContext["status"] };

/** Loads a user's scoped roles (baseline AD3): communities, teams and managed games. */
export async function loadAuthzContext(user: ContextUser): Promise<AuthzContext> {
  const [communities, teams, managed] = await Promise.all([
    db.communityMembership.findMany({ where: { userId: user.id }, select: { gameId: true } }),
    db.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } }),
    db.gameManagerAssignment.findMany({ where: { userId: user.id }, select: { gameId: true } }),
  ]);
  return {
    userId: user.id,
    isAdmin: user.isAdmin,
    status: user.status,
    communityGameIds: new Set(communities.map((c) => c.gameId)),
    teamIds: new Set(teams.map((t) => t.teamId)),
    managedGameIds: new Set(managed.map((m) => m.gameId)),
  };
}

export function authorize(actor: Actor, action: Action, resource: Resource): void {
  if (!can(actor, action, resource)) throw new ForbiddenError();
}

/** Context for a user id, read fresh from the database (used by services and tests). */
export async function contextForUserId(userId: string): Promise<AuthzContext> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, isAdmin: true, status: true } });
  return loadAuthzContext(user);
}
