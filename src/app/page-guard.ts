import "server-only";
import { notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/server/errors";

/** Runs a page's data load: NotFoundError → 404, ForbiddenError → { forbidden: true }. */
export async function guard<T>(load: () => Promise<T>): Promise<{ forbidden: true } | { forbidden: false; data: T }> {
  try {
    return { forbidden: false, data: await load() };
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    if (err instanceof ForbiddenError) return { forbidden: true };
    throw err;
  }
}
