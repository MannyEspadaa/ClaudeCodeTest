import type { SessionUser } from "@/server/auth/session";
import { ForbiddenError } from "@/server/errors";
import { can, type Action, type Actor, type AuthzContext, type Resource } from "./policy";

/**
 * Builds the authorization context for a signed-in user.
 * Phase 1 has no game/team tables yet, so the scoped sets are empty; Phase 2 loads
 * community, team and Game Manager memberships here. Nothing else needs to change.
 */
export async function loadAuthzContext(user: SessionUser): Promise<AuthzContext> {
  return {
    userId: user.id,
    isAdmin: user.isAdmin,
    status: user.status,
    communityGameIds: new Set(),
    teamIds: new Set(),
    managedGameIds: new Set(),
  };
}

export function authorize(actor: Actor, action: Action, resource: Resource): void {
  if (!can(actor, action, resource)) throw new ForbiddenError();
}
