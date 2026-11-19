"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import * as discord from "@/server/services/discord-service";
import * as feed from "@/server/services/feed-service";
import * as moderation from "@/server/services/moderation-service";
import { pick, type FormState } from "./form-state";
import { run, str } from "./run";

export async function unlinkDiscordAction(): Promise<FormState> {
  const { user } = await requireUser();
  await discord.unlinkDiscord(user.id);
  revalidatePath("/", "layout");
  return { status: "success", message: "Discord unlinked." };
}

export async function regenerateFeedAction(): Promise<FormState> {
  const { user } = await requireUser();
  const url = await feed.regenerateFeed(user.id);
  revalidatePath("/profile");
  // Shown once; only a hash is stored.
  return { status: "success", message: url, code: "FEED_URL" };
}

export async function revokeFeedAction(): Promise<FormState> {
  const { user } = await requireUser();
  await feed.revokeFeed(user.id);
  revalidatePath("/profile");
  return { status: "success", message: "Calendar link turned off." };
}

export async function suspendAction(_p: FormState, f: FormData) {
  const values = pick(f, "reason", "until");
  return run(async (ctx) => {
    await moderation.suspendUser(ctx, str(f, "userId"), values);
    return "Account suspended and signed out.";
  }, values);
}

export async function liftSuspensionAction(_p: FormState, f: FormData) {
  return run(async (ctx) => {
    await moderation.liftSuspension(ctx, str(f, "userId"));
    return "Suspension lifted.";
  });
}

export async function removeUserAction(_p: FormState, f: FormData) {
  const values = pick(f, "reason");
  return run(async (ctx) => {
    await moderation.removeUser(ctx, str(f, "userId"), values);
    return "Account removed and anonymized.";
  }, values);
}
