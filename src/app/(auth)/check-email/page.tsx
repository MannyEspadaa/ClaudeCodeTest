import type { Metadata } from "next";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Check your email · Esports Hub" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <ResendForm email={email ?? ""} />;
}
