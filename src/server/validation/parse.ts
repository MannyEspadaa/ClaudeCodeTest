import type { z } from "zod";
import { ServiceError, type FieldErrors } from "@/server/errors";

/** Parse input or throw a ServiceError carrying per-field messages. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new ServiceError("VALIDATION", "Please fix the highlighted fields.", fieldErrors);
}
