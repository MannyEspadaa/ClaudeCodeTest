"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { idle } from "@/app/actions/form-state";
import { AuthCard } from "@/components/card";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, idle);
  return (
    <AuthCard title="Reset your password">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        <Field label="Email" name="email" type="email" autoComplete="email" state={state} />
        <SubmitButton>Send reset link</SubmitButton>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-accent underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
