import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Esports Hub" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; verified?: string }>;
}) {
  const { next, reset, verified } = await searchParams;
  const notice = reset
    ? "Password updated. Log in with your new password."
    : verified
      ? "Email verified. You can log in now."
      : undefined;
  return <LoginForm next={next} notice={notice} />;
}
