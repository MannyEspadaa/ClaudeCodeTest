"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as accounts from "@/server/services/account-service";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { SESSION_COOKIE, invalidateSessionToken } from "@/server/auth/session";
import { clearSessionCookie, setSessionCookie } from "@/server/auth/current-user";
import { cookies } from "next/headers";
import { pick, toErrorState, type FormState } from "./form-state";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

const TOO_MANY: FormState = { status: "error", message: "Too many attempts. Please wait and try again." };

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = pick(form, "email", "fullName", "username");
  if (!consumeRateLimit(`register:${await clientIp()}`, RATE_LIMITS.registerPerIp)) return { ...TOO_MANY, values };
  try {
    await accounts.register({ ...values, password: String(form.get("password") ?? "") });
  } catch (err) {
    return toErrorState(err, values);
  }
  redirect(`/check-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = pick(form, "email");
  const email = values.email.trim().toLowerCase();
  const ip = await clientIp();
  if (
    !consumeRateLimit(`login:ip:${ip}`, RATE_LIMITS.loginPerIp) ||
    !consumeRateLimit(`login:email:${email}`, RATE_LIMITS.loginPerAccount)
  ) {
    return { ...TOO_MANY, values };
  }
  try {
    const session = await accounts.login({ email: values.email, password: String(form.get("password") ?? "") });
    await setSessionCookie(session.token, session.expiresAt);
  } catch (err) {
    return toErrorState(err, values);
  }
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await invalidateSessionToken(token);
  await clearSessionCookie();
  redirect("/login");
}

export async function resendVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = pick(form, "email");
  if (!consumeRateLimit(`email:${values.email.trim().toLowerCase()}`, RATE_LIMITS.emailPerAddress)) {
    return { ...TOO_MANY, values };
  }
  try {
    await accounts.resendVerification(values);
  } catch (err) {
    return toErrorState(err, values);
  }
  return { status: "success", message: "If that account needs verifying, a new link is on its way.", values };
}

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = pick(form, "email");
  if (!consumeRateLimit(`email:${values.email.trim().toLowerCase()}`, RATE_LIMITS.emailPerAddress)) {
    return { ...TOO_MANY, values };
  }
  try {
    await accounts.requestPasswordReset(values);
  } catch (err) {
    return toErrorState(err, values);
  }
  return {
    status: "success",
    message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour.",
    values,
  };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await accounts.resetPassword({ token: form.get("token"), password: form.get("password") });
  } catch (err) {
    return toErrorState(err);
  }
  await clearSessionCookie();
  redirect("/login?reset=1");
}
