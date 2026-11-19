import { ForbiddenError, ServiceError, type FieldErrors } from "@/server/errors";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  code?: string;
  fieldErrors?: FieldErrors;
  /** Echo submitted non-secret values so forms keep them after an error. */
  values?: Record<string, string>;
};

export const idle: FormState = { status: "idle" };

export function toErrorState(err: unknown, values?: Record<string, string>): FormState {
  if (err instanceof ServiceError) {
    return { status: "error", message: err.message, code: err.code, fieldErrors: err.fieldErrors, values };
  }
  if (err instanceof ForbiddenError) return { status: "error", message: err.message, values };
  console.error(err);
  return { status: "error", message: "Something went wrong. Please try again.", values };
}

export function pick(form: FormData, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));
}
