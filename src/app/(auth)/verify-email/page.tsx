import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyEmail } from "@/server/services/account-service";
import { ServiceError } from "@/server/errors";
import { AuthCard } from "@/components/card";

export const metadata: Metadata = { title: "Verify email · Esports Hub" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let error = "This verification link is missing its token.";
  if (token) {
    try {
      await verifyEmail(token);
      error = "";
    } catch (err) {
      if (!(err instanceof ServiceError)) throw err;
      error = err.message;
    }
  }
  if (!error) redirect("/login?verified=1");
  return (
    <AuthCard title="Verification failed">
      <p role="alert" className="mb-6 text-danger">
        {error}
      </p>
      <Link href="/check-email" className="text-accent underline">
        Request a new link
      </Link>
    </AuthCard>
  );
}
