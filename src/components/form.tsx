"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/form-state";

export function Field({
  label,
  name,
  type = "text",
  state,
  defaultValue,
  autoComplete,
  hint,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  state?: FormState;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  const errors = state?.fieldErrors?.[name];
  const id = `field-${name}`;
  const describedBy = [hint && `${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={state?.values?.[name] ?? defaultValue}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 aria-[invalid]:border-danger"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {errors && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const tone = state.status === "error" ? "border-danger/40 bg-danger/10 text-danger" : "border-ok/40 bg-ok/10 text-ok";
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      {state.message}
    </p>
  );
}
