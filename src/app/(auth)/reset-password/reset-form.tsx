"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { idle } from "@/app/actions/form-state";
import { AuthCard } from "@/components/card";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, idle);
  return (
    <AuthCard title="Choose a new password">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        {state.code === "INVALID_TOKEN" && (
          <Link href="/forgot-password" className="text-sm text-accent underline">
            Request a new reset link
          </Link>
        )}
        <input type="hidden" name="token" value={token} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          state={state}
          hint="At least 10 characters. You'll be signed out of other devices."
        />
        <SubmitButton>Update password</SubmitButton>
      </form>
    </AuthCard>
  );
}
