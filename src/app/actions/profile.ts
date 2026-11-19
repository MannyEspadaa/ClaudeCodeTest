"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import { authorize } from "@/server/authz/context";
import * as accounts from "@/server/services/account-service";
import { pick, toErrorState, type FormState } from "./form-state";

export async function updateProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = pick(form, "fullName", "username");
  // requireUser redirects (throws) when signed out, so it stays outside the try.
  const { user, ctx } = await requireUser();
  try {
    authorize(ctx, "profile.edit", { type: "user", userId: user.id });
    await accounts.updateOwnProfile(user.id, values);
  } catch (err) {
    return toErrorState(err, values);
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved.", values };
}
