"use server";

import { redirect } from "next/navigation";
import * as vods from "@/server/services/vod-service";
import * as stats from "@/server/services/stats-service";
import * as comments from "@/server/services/comment-service";
import { pick, type FormState } from "./form-state";
import { run, str } from "./run";

export async function addVodAction(_p: FormState, f: FormData) {
  const values = pick(f, "title", "url", "scheduleEntryId");
  return run(async (ctx) => {
    await vods.addVod(ctx, str(f, "teamId"), values);
    return "VOD added.";
  }, values);
}

export async function deleteVodAction(_p: FormState, f: FormData): Promise<FormState> {
  const state = await run((ctx) => vods.deleteVod(ctx, str(f, "vodId")));
  if (state.status === "success") redirect(`/teams/${str(f, "teamId")}/vods`);
  return state;
}

export async function addCommentAction(_p: FormState, f: FormData) {
  const values = pick(f, "body");
  return run(async (ctx) => {
    const target = str(f, "targetType") === "VOD" ? "VOD" : "STAT_SHEET";
    await comments.addComment(ctx, target, str(f, "targetId"), values, str(f, "parentId") || null);
    return "Comment posted.";
  }, values);
}

export async function deleteCommentAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await comments.deleteComment(ctx, str(f, "commentId"));
    return "Comment deleted.";
  });
}

/** Collects `team.<key>` and `p.<userId>.<key>` fields from the stat sheet form. */
function sheetInput(f: FormData): stats.SheetInput {
  const team: Record<string, string> = {};
  const players: Record<string, Record<string, string>> = {};
  for (const [name, value] of f.entries()) {
    if (typeof value !== "string") continue;
    if (name.startsWith("team.")) team[name.slice(5)] = value;
    else if (name.startsWith("p.")) {
      const [, userId, key] = name.split(".");
      (players[userId] ??= {})[key] = value;
    }
  }
  return { title: str(f, "title"), playedAt: str(f, "playedAt"), scheduleEntryId: str(f, "scheduleEntryId"), team, players };
}

export async function saveSheetAction(_p: FormState, f: FormData): Promise<FormState> {
  const values = Object.fromEntries([...f.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, v as string]));
  const teamId = str(f, "teamId");
  const sheetId = str(f, "sheetId");
  let id = sheetId;
  const state = await run(async (ctx) => {
    if (sheetId) await stats.updateSheet(ctx, sheetId, sheetInput(f));
    else id = (await stats.createSheet(ctx, teamId, sheetInput(f))).id;
  }, values);
  if (state.status === "success") redirect(`/teams/${teamId}/stats/${id}`);
  return state;
}

export async function deleteSheetAction(_p: FormState, f: FormData): Promise<FormState> {
  const state = await run((ctx) => stats.deleteSheet(ctx, str(f, "sheetId")));
  if (state.status === "success") redirect(`/teams/${str(f, "teamId")}/stats`);
  return state;
}

export async function createDefinitionAction(_p: FormState, f: FormData) {
  const values = pick(f, "key", "label", "level", "kind", "formula", "precision");
  return run(async (ctx) => {
    await stats.createDefinition(ctx, str(f, "gameId"), values);
    return `Added “${values.label.trim()}”.`;
  }, values);
}

export async function updateDefinitionAction(_p: FormState, f: FormData) {
  const values = pick(f, "label", "formula", "precision");
  return run(async (ctx) => {
    await stats.updateDefinition(ctx, str(f, "id"), values);
    return "Saved.";
  }, values);
}

export async function deleteDefinitionAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await stats.deleteDefinition(ctx, str(f, "id"));
    return "Deleted.";
  });
}

export async function addTemplateAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    const n = await stats.addTemplate(ctx, str(f, "gameId"));
    return n ? `Added ${n} stats.` : "All starter stats already exist.";
  });
}
