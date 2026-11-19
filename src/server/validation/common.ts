import { z } from "zod";

export const id = z.string().trim().min(1, "Missing id.").max(64);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

/** Empty string → null, otherwise a positive integer. */
export const optionalPositiveInt = (max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isInteger(n) || n < 1 || n > max) {
        ctx.addIssue({ code: "custom", message: `Enter a whole number from 1 to ${max}, or leave blank.` });
        return z.NEVER;
      }
      return n;
    });

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
