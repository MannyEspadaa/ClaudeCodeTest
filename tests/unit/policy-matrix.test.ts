// NFREQ10: one assertion per permission-matrix cell (docs/requirements-baseline.md §5).
import { describe, expect, it } from "vitest";
import { ACTIONS, can, type Action, type Actor, type AuthzContext, type Resource } from "@/server/authz/policy";

const G1 = "game-1";
const G2 = "game-2";
const T1 = "team-1"; // in G1
const T2 = "team-2"; // in G1, user not on it
const T3 = "team-3"; // in G2

function ctx(overrides: Partial<AuthzContext>): AuthzContext {
  return {
    userId: "me",
    isAdmin: false,
    status: "ACTIVE",
    communityGameIds: new Set(),
    teamIds: new Set(),
    managedGameIds: new Set(),
    ...overrides,
  };
}

const personas: Record<string, Actor> = {
  anonymous: null,
  user: ctx({}),
  communityMember: ctx({ communityGameIds: new Set([G1]) }),
  player: ctx({ communityGameIds: new Set([G1]), teamIds: new Set([T1]) }),
  gameManager: ctx({ managedGameIds: new Set([G1]) }),
  admin: ctx({ isAdmin: true }),
  suspendedAdmin: ctx({ isAdmin: true, status: "SUSPENDED" }),
};
type Persona = keyof typeof personas;
const ALL: Persona[] = Object.keys(personas) as Persona[];
const LOGGED_IN_ACTIVE: Persona[] = ["user", "communityMember", "player", "gameManager", "admin"];

const resources = {
  global: { type: "global" },
  self: { type: "user", userId: "me" },
  otherUser: { type: "user", userId: "someone", gameIds: [G2] },
  memberOfG1: { type: "user", userId: "someone", gameIds: [G1] },
  game1: { type: "game", gameId: G1 },
  game2: { type: "game", gameId: G2 },
  team1: { type: "team", teamId: T1, gameId: G1 },
  team2: { type: "team", teamId: T2, gameId: G1 },
  team3: { type: "team", teamId: T3, gameId: G2 },
} satisfies Record<string, Resource>;
type ResourceKey = keyof typeof resources;

// [action, resource, personas allowed]. Every persona not listed must be denied.
const matrix: [Action, ResourceKey, Persona[]][] = [
  ["schedule.viewPublic", "global", ALL],
  ["dashboard.view", "global", LOGGED_IN_ACTIVE],
  ["schedule.viewMembers", "global", LOGGED_IN_ACTIVE],
  ["profile.view", "otherUser", LOGGED_IN_ACTIVE],
  ["profile.edit", "self", LOGGED_IN_ACTIVE],
  ["profile.edit", "otherUser", ["admin"]],
  ["profile.viewPii", "self", LOGGED_IN_ACTIVE],
  ["profile.viewPii", "otherUser", ["admin"]],
  ["profile.viewPii", "memberOfG1", ["gameManager", "admin"]],
  ["community.join", "game1", LOGGED_IN_ACTIVE],
  ["community.view", "game1", ["communityMember", "player", "gameManager", "admin"]],
  ["community.view", "game2", ["admin"]],
  ["team.requestJoin", "team2", ["communityMember", "player", "gameManager", "admin"]],
  ["team.requestJoin", "team3", ["admin"]],
  ["team.view", "team1", ["player", "gameManager", "admin"]],
  ["team.view", "team2", ["gameManager", "admin"]],
  ["team.view", "team3", ["admin"]],
  ["teamData.view", "team1", ["player", "gameManager", "admin"]],
  ["teamData.view", "team2", ["gameManager", "admin"]],
  ["teamData.reply", "team1", ["player", "gameManager", "admin"]],
  ["teamData.reply", "team3", ["admin"]],
  ["team.create", "game1", ["gameManager", "admin"]],
  ["team.create", "game2", ["admin"]],
  ["team.manage", "team1", ["gameManager", "admin"]],
  ["team.manage", "team3", ["admin"]],
  ["roster.manage", "team2", ["gameManager", "admin"]],
  ["roster.manage", "team3", ["admin"]],
  ["event.manageGame", "game1", ["gameManager", "admin"]],
  ["event.manageGame", "game2", ["admin"]],
  ["schedule.manage", "game1", ["gameManager", "admin"]],
  ["schedule.manage", "game2", ["admin"]],
  ["teamData.manage", "team1", ["gameManager", "admin"]],
  ["teamData.manage", "team3", ["admin"]],
  ["announcement.postGame", "game1", ["gameManager", "admin"]],
  ["announcement.postGame", "game2", ["admin"]],
  ["event.manageGlobal", "global", ["admin"]],
  ["announcement.postGlobal", "global", ["admin"]],
  ["games.manage", "global", ["admin"]],
  ["roles.manage", "global", ["admin"]],
  ["users.moderate", "global", ["admin"]],
];

describe("permission matrix", () => {
  for (const [action, resourceKey, allowed] of matrix) {
    for (const persona of ALL) {
      const expected = allowed.includes(persona);
      it(`${persona} ${expected ? "can" : "cannot"} ${action} on ${resourceKey}`, () => {
        expect(can(personas[persona], action, resources[resourceKey])).toBe(expected);
      });
    }
  }

  it("covers every action at least once", () => {
    const covered = new Set(matrix.map(([a]) => a));
    expect(Object.keys(ACTIONS).filter((a) => !covered.has(a as Action))).toEqual([]);
  });

  it("rejects a resource of the wrong type", () => {
    expect(() => can(personas.admin, "team.view", resources.game1)).toThrow();
  });
});
