"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { idle } from "@/app/actions/form-state";
import { SubmitButton } from "./form";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** A one-button form for a Server Action, with inline success/error feedback. */
export function ActionButton({
  action,
  fields,
  label,
  variant = "secondary",
  confirm,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size="sm">
        {label}
      </SubmitButton>
      {state.status === "error" && (
        <span role="alert" className="text-xs text-danger">
          {state.message}
        </span>
      )}
    </form>
  );
}
