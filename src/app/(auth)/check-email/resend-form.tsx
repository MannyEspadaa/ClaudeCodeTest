"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction } from "@/app/actions/auth";
import { idle } from "@/app/actions/form-state";
import { AuthCard } from "@/components/card";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerificationAction, idle);
  return (
    <AuthCard title="Check your email">
      <p className="mb-6 text-muted">
        We sent a verification link{email ? <> to <strong className="text-fg">{email}</strong></> : null}. Open it
        to activate your account. The link expires in 24 hours.
      </p>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        <Field label="Didn't get it? Resend to" name="email" type="email" defaultValue={email} state={state} />
        <SubmitButton>Resend link</SubmitButton>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-accent underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
