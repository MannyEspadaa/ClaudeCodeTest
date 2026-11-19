import { z } from "zod";
import { parseLocalDateTime } from "@/lib/time";

/** A datetime-local string interpreted in APP_TIMEZONE; also accepts Date objects (services/tests). */
export const localDateTime = (label: string) =>
  z.union([z.string(), z.date()]).transform((v, ctx) => {
    if (v instanceof Date) return v;
    const d = parseLocalDateTime(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: `${label} is required.` });
      return z.NEVER;
    }
    return d;
  });

/** Use as `.superRefine(timeOrder)` on object schemas with startsAt/endsAt. */
export function timeOrder(v: { startsAt: Date; endsAt: Date }, ctx: z.RefinementCtx) {
  if (v.endsAt <= v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start." });
}
