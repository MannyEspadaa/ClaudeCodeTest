"use server";

import { redirect } from "next/navigation";
import * as community from "@/server/services/community-service";
import * as teams from "@/server/services/team-service";
import * as roster from "@/server/services/roster-service";
import { pick, type FormState } from "./form-state";
import { run, str } from "./run";

export async function joinCommunityAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await community.joinCommunity(ctx, str(f, "gameId"));
    return "Joined the community.";
  });
}

export async function leaveCommunityAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const { teamsLeft } = await community.leaveCommunity(ctx, str(f, "gameId"));
    return teamsLeft ? `Left the community and ${teamsLeft} team(s).` : "Left the community.";
  });
}

export async function requestJoinAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await roster.requestToJoin(ctx, str(f, "teamId"));
    return "Request sent to the game managers.";
  });
}

export async function cancelRequestAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await roster.cancelRequest(ctx, str(f, "requestId"));
    return "Request cancelled.";
  });
}

export async function leaveTeamAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await roster.leaveTeam(ctx, str(f, "teamId"));
    return "You left the team.";
  });
}

export async function createTeamAction(_p: FormState, f: FormData) {
  const values = pick(f, "name", "maxRosterSize", "season");
  return run(async (ctx) => {
    await teams.createTeam(ctx, str(f, "gameId"), values);
    return `Team “${values.name.trim()}” created.`;
  }, values);
}

export async function updateTeamAction(_p: FormState, f: FormData) {
  const values = pick(f, "name", "maxRosterSize", "season");
  return run(async (ctx) => {
    await teams.updateTeam(ctx, str(f, "teamId"), values);
    return "Team saved.";
  }, values);
}

export async function archiveTeamAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const archived = str(f, "archived") === "true";
    await teams.setTeamArchived(ctx, str(f, "teamId"), archived);
    return archived ? "Team archived." : "Team restored.";
  });
}

export async function deleteTeamAction(_p: FormState, f: FormData): Promise<FormState> {
  const state = await run(async (ctx) => {
    await teams.deleteTeam(ctx, str(f, "teamId"));
  });
  if (state.status === "success") redirect("/manage");
  return state;
}

export async function decideRequestAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const approve = str(f, "decision") === "approve";
    await roster.decideRequest(ctx, str(f, "requestId"), approve);
    return approve ? "Request approved." : "Request denied.";
  });
}

export async function addPlayerAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await roster.addPlayer(ctx, str(f, "teamId"), str(f, "userId"));
    return "Player added.";
  });
}

export async function removePlayerAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await roster.removePlayer(ctx, str(f, "teamId"), str(f, "userId"));
    return "Player removed.";
  });
}
