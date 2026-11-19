import { z } from "zod";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

const fullName = z
  .string()
  .trim()
  .min(1, "Full name is required.")
  .max(100, "Full name must be at most 100 characters.");

const username = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[A-Za-z0-9_]+$/, "Username may only contain letters, numbers and underscores.");

const password = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters.`);

export const registerSchema = z.object({ email, fullName, username, password });
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(PASSWORD_MAX),
});
export type LoginInput = z.input<typeof loginSchema>;

export const emailOnlySchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset link is invalid."),
  password,
});

export const updateProfileSchema = z.object({ fullName, username });
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export function emailDomain(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1);
}
