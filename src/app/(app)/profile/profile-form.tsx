"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { idle } from "@/app/actions/form-state";
import { Field, FormMessage, SubmitButton } from "@/components/form";

export function ProfileForm({ fullName, username }: { fullName: string; username: string }) {
  const [state, action] = useActionState(updateProfileAction, idle);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={fullName} state={state} />
      <Field label="Username" name="username" autoComplete="username" defaultValue={username} state={state} />
      <div>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}
