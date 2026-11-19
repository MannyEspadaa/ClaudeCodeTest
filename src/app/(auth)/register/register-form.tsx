"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { idle } from "@/app/actions/form-state";
import { AuthCard } from "@/components/card";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, idle);
  return (
    <AuthCard title="Create your account">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        <Field label="School email" name="email" type="email" autoComplete="email" state={state} />
        <Field label="Full name" name="fullName" autoComplete="name" state={state} />
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          state={state}
          hint="3–24 letters, numbers or underscores. Shown to other members."
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          state={state}
          hint="At least 10 characters."
        />
        <SubmitButton>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
