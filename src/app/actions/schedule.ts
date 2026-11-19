"use server";

import { redirect } from "next/navigation";
import * as schedule from "@/server/services/schedule-service";
import * as announcements from "@/server/services/announcement-service";
import { pick, type FormState } from "./form-state";
import { run, str } from "./run";

const EVENT_FIELDS = ["name", "description", "location", "startsAt", "endsAt", "visibility"];
const ENTRY_FIELDS = ["type", "title", "teamId", "opponent", "location", "startsAt", "endsAt", "visibility", "result"];

const scope = (f: FormData) => str(f, "gameId") || null;

export async function createEventAction(_p: FormState, f: FormData) {
  const values = pick(f, ...EVENT_FIELDS);
  return run(async (ctx) => {
    await schedule.createEvent(ctx, scope(f), values);
    return `Event “${values.name.trim()}” created.`;
  }, values);
}

export async function updateEventAction(_p: FormState, f: FormData) {
  const values = pick(f, ...EVENT_FIELDS);
  return run(async (ctx) => {
    await schedule.updateEvent(ctx, str(f, "id"), values);
    return "Event saved.";
  }, values);
}

export async function createEntryAction(_p: FormState, f: FormData) {
  const values = pick(f, ...ENTRY_FIELDS);
  return run(async (ctx) => {
    await schedule.createScheduleEntry(ctx, str(f, "gameId"), { ...values, allowConflict: str(f, "allowConflict") });
    return "Added to the schedule.";
  }, values);
}

export async function updateEntryAction(_p: FormState, f: FormData) {
  const values = pick(f, ...ENTRY_FIELDS);
  return run(async (ctx) => {
    await schedule.updateScheduleEntry(ctx, str(f, "id"), { ...values, allowConflict: str(f, "allowConflict") });
    return "Schedule entry saved.";
  }, values);
}

export async function deleteItemAction(_p: FormState, f: FormData): Promise<FormState> {
  const state = await run(async (ctx) => {
    if (str(f, "kind") === "event") await schedule.deleteEvent(ctx, str(f, "id"));
    else await schedule.deleteScheduleEntry(ctx, str(f, "id"));
  });
  if (state.status === "success") redirect("/manage/schedule");
  return state;
}

export async function postAnnouncementAction(_p: FormState, f: FormData) {
  const values = pick(f, "title", "body", "gameId");
  return run(async (ctx) => {
    await announcements.postAnnouncement(ctx, values.gameId || null, values);
    return "Announcement posted.";
  }, values);
}

export async function deleteAnnouncementAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await announcements.deleteAnnouncement(ctx, str(f, "id"));
    return "Announcement deleted.";
  });
}
