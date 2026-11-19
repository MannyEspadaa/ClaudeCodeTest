"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { idle } from "@/app/actions/form-state";
import { AuthCard } from "@/components/card";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, idle);
  const email = state.values?.email ?? "";
  return (
    <AuthCard title="Log in">
      <form action={action} className="flex flex-col gap-4" noValidate>
        {notice && state.status === "idle" && (
          <p role="status" className="rounded-md border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">
            {notice}
          </p>
        )}
        <FormMessage state={state} />
        {state.code === "EMAIL_NOT_VERIFIED" && (
          <p className="text-sm">
            <Link href={`/check-email?email=${encodeURIComponent(email)}`} className="text-accent underline">
              Resend the verification email
            </Link>
          </p>
        )}
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" name="email" type="email" autoComplete="email" state={state} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" state={state} />
        <SubmitButton>Log in</SubmitButton>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm text-muted">
        <Link href="/forgot-password" className="text-accent underline">
          Forgot password?
        </Link>
        <span>
          New here?{" "}
          <Link href="/register" className="text-accent underline">
            Create an account
          </Link>
        </span>
      </div>
    </AuthCard>
  );
}
