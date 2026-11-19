"use client";

import { useActionState, useId } from "react";
import { saveSheetAction } from "@/app/actions/team-data";
import { idle, type FormState } from "@/app/actions/form-state";
import { FormMessage, SubmitButton } from "./form";

type Def = { key: string; label: string; level: "PLAYER" | "TEAM" };

/** FREQ30 data entry: one team row and one row per player, with per-cell errors. */
export function StatSheetForm({
  teamId,
  defs,
  players,
  entries,
  initial,
}: {
  teamId: string;
  defs: Def[];
  players: { id: string; username: string }[];
  entries: { id: string; label: string }[];
  initial?: { id: string; title: string; playedAt: string; scheduleEntryId: string | null; teamValues: Record<string, number>; lines: Record<string, Record<string, number>> };
}) {
  const [state, action] = useActionState(
    async (prev: FormState & { nonce?: number }, f: FormData) => ({ ...(await saveSheetAction(prev, f)), nonce: Math.random() }),
    idle as FormState & { nonce?: number },
  );
  const uid = useId();
  const teamDefs = defs.filter((d) => d.level === "TEAM");
  const playerDefs = defs.filter((d) => d.level === "PLAYER");
  const value = (name: string, fallback?: number | string | null) => state.values?.[name] ?? (fallback === undefined || fallback === null ? "" : String(fallback));
  const err = (name: string) => state.fieldErrors?.[name]?.[0];
  const cell = (name: string, label: string, fallback?: number) => (
    <td key={name} className="py-1 pr-2">
      <input
        name={name}
        aria-label={label}
        inputMode="decimal"
        defaultValue={value(name, fallback)}
        aria-invalid={err(name) ? true : undefined}
        title={err(name)}
        className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-right tabular-nums aria-[invalid]:border-danger"
      />
    </td>
  );
  const input = "rounded-md border border-border bg-surface px-3 py-2";

  return (
    <form action={action} className="flex flex-col gap-6" noValidate key={state.nonce ?? "initial"}>
      <FormMessage state={state} />
      <input type="hidden" name="teamId" value={teamId} />
      {initial && <input type="hidden" name="sheetId" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-title`} className="text-sm font-medium">
            Title
          </label>
          <input id={`${uid}-title`} name="title" defaultValue={value("title", initial?.title)} placeholder="e.g. vs State, Week 3" className={input} aria-invalid={err("title") ? true : undefined} />
          {err("title") && <p className="text-sm text-danger">{err("title")}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-playedAt`} className="text-sm font-medium">
            Date played
          </label>
          <input id={`${uid}-playedAt`} name="playedAt" type="datetime-local" defaultValue={value("playedAt", initial?.playedAt)} className={input} aria-invalid={err("playedAt") ? true : undefined} />
          {err("playedAt") && <p className="text-sm text-danger">{err("playedAt")}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-entry`} className="text-sm font-medium">
            Match (optional)
          </label>
          <select id={`${uid}-entry`} name="scheduleEntryId" defaultValue={value("scheduleEntryId", initial?.scheduleEntryId)} className={input}>
            <option value="">Not linked</option>
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {teamDefs.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-semibold">Team</legend>
          <table className="text-sm">
            <thead className="text-muted">
              <tr>
                {teamDefs.map((d) => (
                  <th key={d.key} className="pb-1 pr-2 text-left font-medium">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>{teamDefs.map((d) => cell(`team.${d.key}`, `Team ${d.label}`, initial?.teamValues[d.key]))}</tr>
            </tbody>
          </table>
        </fieldset>
      )}

      {playerDefs.length > 0 && (
        <fieldset className="overflow-x-auto">
          <legend className="mb-2 font-semibold">Players</legend>
          {players.length === 0 ? (
            <p className="text-sm text-muted">This team has no players.</p>
          ) : (
            <table className="text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-1 pr-4 text-left font-medium">Player</th>
                  {playerDefs.map((d) => (
                    <th key={d.key} className="pb-1 pr-2 text-left font-medium">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="pr-4 text-left font-medium">
                      {p.username}
                    </th>
                    {playerDefs.map((d) => cell(`p.${p.id}.${d.key}`, `${p.username} ${d.label}`, initial?.lines[p.id]?.[d.key]))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-muted">Leave a player&apos;s row empty if they didn&apos;t play. Calculated stats (like KDA) are filled in automatically.</p>
        </fieldset>
      )}
      <div>
        <SubmitButton>{initial ? "Save stats" : "Record stats"}</SubmitButton>
      </div>
    </form>
  );
}
