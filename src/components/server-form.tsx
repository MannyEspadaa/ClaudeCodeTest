"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { idle } from "@/app/actions/form-state";
import { Field, FormMessage, SubmitButton } from "./form";

type FieldDef = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
};

/** Multi-field form bound to a Server Action, with field errors and a status message. */
export function ServerForm({
  action,
  fields,
  hidden = {},
  submitLabel,
  resetOnSuccess = false,
  layout = "stack",
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  fields: FieldDef[];
  hidden?: Record<string, string>;
  submitLabel: string;
  resetOnSuccess?: boolean;
  layout?: "stack" | "grid";
}) {
  const [state, formAction] = useActionState(action, idle);
  // Remount inputs after a successful create so they clear.
  const key = resetOnSuccess && state.status === "success" ? state.message : "form";
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div key={key} className={layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
        {fields.map((f) =>
          f.options ? (
            <SelectField key={f.name} def={f} state={state} />
          ) : f.rows ? (
            <TextAreaField key={f.name} def={f} state={state} />
          ) : (
            <Field
              key={f.name}
              label={f.label}
              name={f.name}
              type={f.type}
              hint={f.hint}
              required={f.required ?? true}
              defaultValue={f.defaultValue}
              state={resetOnSuccess && state.status === "success" ? undefined : state}
            />
          ),
        )}
      </div>
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

const inputClass =
  "rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 aria-[invalid]:border-danger";

function SelectField({ def, state }: { def: FieldDef; state: FormState }) {
  const errors = state.fieldErrors?.[def.name];
  const id = `field-${def.name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {def.label}
      </label>
      <select id={id} name={def.name} defaultValue={state.values?.[def.name] ?? def.defaultValue} className={inputClass} aria-invalid={errors ? true : undefined}>
        {def.options!.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {def.hint && <p className="text-xs text-muted">{def.hint}</p>}
      {errors && <p className="text-sm text-danger">{errors[0]}</p>}
    </div>
  );
}

function TextAreaField({ def, state }: { def: FieldDef; state: FormState }) {
  const errors = state.fieldErrors?.[def.name];
  const id = `field-${def.name}`;
  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-medium">
        {def.label}
      </label>
      <textarea
        id={id}
        name={def.name}
        rows={def.rows}
        defaultValue={state.values?.[def.name] ?? def.defaultValue}
        className={inputClass}
        aria-invalid={errors ? true : undefined}
      />
      {def.hint && <p className="text-xs text-muted">{def.hint}</p>}
      {errors && <p className="text-sm text-danger">{errors[0]}</p>}
    </div>
  );
}
