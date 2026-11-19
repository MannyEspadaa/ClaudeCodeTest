import "server-only";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError } from "@/server/errors";
import { toErrorState, type FormState } from "./form-state";

/**
 * Shared body for Server Actions: resolve the signed-in actor, run the service call,
 * map expected errors to form state and refresh rendered pages.
 */
export async function run(
  fn: (ctx: AuthzContext) => Promise<string | void>,
  values?: Record<string, string>,
): Promise<FormState> {
  const { ctx } = await requireUser(); // redirects when signed out; must stay outside try
  let message: string | void;
  try {
    message = await fn(ctx);
  } catch (err) {
    if (err instanceof NotFoundError) return { status: "error", message: err.message, values };
    return toErrorState(err, values);
  }
  revalidatePath("/", "layout");
  return { status: "success", message: message || "Saved.", values };
}

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}
