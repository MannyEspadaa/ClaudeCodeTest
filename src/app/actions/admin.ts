"use server";

import * as games from "@/server/services/game-service";
import * as roles from "@/server/services/role-service";
import { pick, type FormState } from "./form-state";
import { run, str } from "./run";

export async function createGameAction(_p: FormState, f: FormData) {
  const values = pick(f, "name");
  return run(async (ctx) => {
    const game = await games.createGame(ctx, values);
    return `Created ${game.name}.`;
  }, values);
}

export async function renameGameAction(_p: FormState, f: FormData) {
  const values = pick(f, "name");
  return run(async (ctx) => {
    await games.renameGame(ctx, str(f, "gameId"), values);
    return "Renamed.";
  }, values);
}

export async function archiveGameAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const archived = str(f, "archived") === "true";
    await games.setGameArchived(ctx, str(f, "gameId"), archived);
    return archived ? "Game archived." : "Game restored.";
  });
}

export async function setGameManagerAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const userId = str(f, "userId");
    const gameId = str(f, "gameId");
    if (str(f, "grant") === "true") {
      await roles.assignGameManager(ctx, userId, gameId);
      return "Game Manager role granted.";
    }
    await roles.unassignGameManager(ctx, userId, gameId);
    return "Game Manager role removed.";
  });
}

export async function setAdminAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const userId = str(f, "userId");
    if (str(f, "grant") === "true") {
      await roles.grantAdmin(ctx, userId);
      return "Admin role granted.";
    }
    await roles.revokeAdmin(ctx, userId);
    return "Admin role removed.";
  });
}
