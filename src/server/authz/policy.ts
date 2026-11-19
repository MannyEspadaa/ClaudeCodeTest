// NFREQ4 / NFREQ10: the single place where authorization decisions are made.
// Implements the scoped permission matrix in docs/requirements-baseline.md §5.
// Pure and synchronous: callers load an AuthzContext once per request (see context.ts).

export type AuthzContext = {
  userId: string;
  isAdmin: boolean;
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  /** Games whose community the user has joined (Community Member scope). */
  communityGameIds: ReadonlySet<string>;
  /** Teams the user is rostered on (Player scope). */
  teamIds: ReadonlySet<string>;
  /** Games the user is assigned to manage (Game Manager scope). */
  managedGameIds: ReadonlySet<string>;
};

/** null = not logged in. */
export type Actor = AuthzContext | null;

export type Resource =
  | { type: "global" }
  | { type: "user"; userId: string; /** games the target user belongs to */ gameIds?: readonly string[] }
  | { type: "game"; gameId: string }
  | { type: "team"; teamId: string; gameId: string };

export const ACTIONS = {
  // Anyone, including logged-out visitors (C5 / NFREQ8)
  "schedule.viewPublic": "global",
  // Any logged-in user
  "dashboard.view": "global",
  "schedule.viewMembers": "global",
  "profile.view": "user",
  "profile.viewPii": "user",
  "profile.edit": "user",
  "community.join": "game",
  // Community Member of the game
  "community.view": "game",
  "team.requestJoin": "team",
  // Player on the team
  "team.view": "team",
  "teamData.view": "team",
  "teamData.reply": "team",
  // Game Manager of the game
  "team.create": "game",
  "team.manage": "team",
  "roster.manage": "team",
  "event.manageGame": "game",
  "schedule.manage": "game",
  "teamData.manage": "team",
  "announcement.postGame": "game",
  // Administrator only
  "event.manageGlobal": "global",
  "announcement.postGlobal": "global",
  "games.manage": "global",
  "roles.manage": "global",
  "users.moderate": "global",
} as const satisfies Record<string, Resource["type"]>;

export type Action = keyof typeof ACTIONS;

function managesGame(ctx: AuthzContext, gameId: string) {
  return ctx.managedGameIds.has(gameId);
}

/** Hierarchy within a game: GM ⊇ Player ⊇ Community Member. */
function inCommunity(ctx: AuthzContext, gameId: string) {
  return ctx.communityGameIds.has(gameId) || managesGame(ctx, gameId);
}

function onTeam(ctx: AuthzContext, teamId: string, gameId: string) {
  return ctx.teamIds.has(teamId) || managesGame(ctx, gameId);
}

export function can(actor: Actor, action: Action, resource: Resource): boolean {
  if (resource.type !== ACTIONS[action]) {
    throw new Error(`Action ${action} expects a ${ACTIONS[action]} resource, got ${resource.type}`);
  }
  if (action === "schedule.viewPublic") return true;
  if (!actor || actor.status !== "ACTIVE") return false;
  // C2: Administrators hold every permission in every scope.
  if (actor.isAdmin) return true;

  switch (action) {
    case "dashboard.view":
    case "schedule.viewMembers":
    case "profile.view":
    case "community.join":
      return true;

    case "profile.edit": {
      const r = resource as Extract<Resource, { type: "user" }>;
      return r.userId === actor.userId;
    }
    case "profile.viewPii": {
      // C6: own record, or a GM of any game the target belongs to.
      const r = resource as Extract<Resource, { type: "user" }>;
      if (r.userId === actor.userId) return true;
      return (r.gameIds ?? []).some((g) => managesGame(actor, g));
    }

    case "community.view": {
      const r = resource as Extract<Resource, { type: "game" }>;
      return inCommunity(actor, r.gameId);
    }
    case "team.requestJoin": {
      const r = resource as Extract<Resource, { type: "team" }>;
      return inCommunity(actor, r.gameId);
    }
    case "team.view":
    case "teamData.view":
    case "teamData.reply": {
      const r = resource as Extract<Resource, { type: "team" }>;
      return onTeam(actor, r.teamId, r.gameId);
    }

    case "team.create":
    case "event.manageGame":
    case "schedule.manage":
    case "announcement.postGame": {
      const r = resource as Extract<Resource, { type: "game" }>;
      return managesGame(actor, r.gameId);
    }
    case "team.manage":
    case "roster.manage":
    case "teamData.manage": {
      const r = resource as Extract<Resource, { type: "team" }>;
      return managesGame(actor, r.gameId);
    }

    case "event.manageGlobal":
    case "announcement.postGlobal":
    case "games.manage":
    case "roles.manage":
    case "users.moderate":
      return false;
  }
}
