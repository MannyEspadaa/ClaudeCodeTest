import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/current-user";
import { listDefinitions } from "@/server/services/stats-service";
import { requireGame } from "@/server/services/game-service";
import { addTemplateAction, createDefinitionAction, deleteDefinitionAction, updateDefinitionAction } from "@/app/actions/team-data";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { ServerForm } from "@/components/server-form";
import { Badge, Empty, NoAccess, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Stat setup · Admin · Esports Hub" };

// FREQ61: define what each game tracks; FREQ43 formulas for calculated stats.
export default async function StatDefsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!(await requireAdmin())) return <NoAccess what="the admin area" />;
  const res = await guard(async () => ({ game: await requireGame(gameId), defs: await listDefinitions(gameId) }));
  if (res.forbidden) return null;
  const { game, defs } = res.data;

  return (
    <>
      <PageHeader
        title={`${game.name} stats`}
        subtitle={
          <>
            <Link href="/admin/games" className="underline">
              All games
            </Link>{" "}
            · Inputs are typed in by Game Managers. Calculated stats use formulas over inputs of the same level; <code>games</code> is the number of matches.
          </>
        }
        actions={<ActionButton action={addTemplateAction} fields={{ gameId }} label="Add starter stats" />}
      />
      <div className="flex flex-col gap-6">
        {(["PLAYER", "TEAM"] as const).map((level) => {
          const list = defs.filter((d) => d.level === level);
          return (
            <Section key={level} title={level === "PLAYER" ? "Per-player stats" : "Team stats"}>
              {list.length === 0 ? (
                <Empty>None yet.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((d) => (
                    <li key={d.id} className="flex flex-col gap-2 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{d.label}</span>
                        <code className="text-xs text-muted">{d.key}</code>
                        {d.kind === "DERIVED" ? <Badge tone="accent">ƒ {d.formula}</Badge> : <Badge>input</Badge>}
                        <ActionButton action={deleteDefinitionAction} fields={{ id: d.id }} label="Delete" variant="danger" confirm={`Delete ${d.label}? Recorded values stay in the database but are hidden.`} />
                      </div>
                      <details>
                        <summary className="cursor-pointer text-xs text-accent">Edit</summary>
                        <div className="mt-2 max-w-xl">
                          <ServerForm
                            action={updateDefinitionAction}
                            hidden={{ id: d.id }}
                            submitLabel="Save"
                            layout="grid"
                            fields={[
                              { label: "Label", name: "label", defaultValue: d.label },
                              { label: "Decimal places", name: "precision", type: "number", defaultValue: String(d.precision) },
                              ...(d.kind === "DERIVED" ? [{ label: "Formula", name: "formula", defaultValue: d.formula ?? "" }] : []),
                            ]}
                          />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })}
        <Section title="Add a stat">
          <ServerForm
            action={createDefinitionAction}
            hidden={{ gameId }}
            submitLabel="Add stat"
            resetOnSuccess
            layout="grid"
            fields={[
              { label: "Label", name: "label", hint: "Shown in tables, e.g. “First bloods”" },
              { label: "Key", name: "key", hint: "Used in formulas, e.g. first_bloods" },
              { label: "Level", name: "level", options: [{ value: "PLAYER", label: "Per player" }, { value: "TEAM", label: "Team" }] },
              { label: "Kind", name: "kind", options: [{ value: "INPUT", label: "Typed in" }, { value: "DERIVED", label: "Calculated (formula)" }] },
              { label: "Formula", name: "formula", required: false, hint: "Calculated only, e.g. (kills + assists) / deaths" },
              { label: "Decimal places", name: "precision", type: "number", defaultValue: "0" },
            ]}
          />
        </Section>
      </div>
    </>
  );
}
