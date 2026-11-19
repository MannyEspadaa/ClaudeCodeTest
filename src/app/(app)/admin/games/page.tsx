import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listGames } from "@/server/services/game-service";
import { archiveGameAction, createGameAction, renameGameAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/action-button";
import { ServerForm } from "@/components/server-form";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Games · Admin · Esports Hub" };

// FREQ50: create, rename and archive games.
export default async function AdminGamesPage() {
  const { ctx } = await requireUser();
  const games = await listGames(ctx, { includeArchived: true });
  return (
    <>
      <PageHeader title="Games" subtitle="Each game has one community. Archived games are read-only." />
      <div className="flex flex-col gap-6">
        <Section title="Add a game">
          <ServerForm action={createGameAction} submitLabel="Add game" resetOnSuccess fields={[{ label: "Game name", name: "name" }]} />
        </Section>
        <Section title={`All games (${games.length})`}>
          {games.length === 0 ? (
            <Empty>No games yet.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {games.map((g) => (
                <li key={g.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/games/${g.slug}`} className="font-medium hover:underline">
                        {g.name}
                      </Link>
                      {g.status === "ARCHIVED" && <Badge tone="danger">Archived</Badge>}
                      <span className="text-sm text-muted">
                        {g.memberCount} members · {g.teamCount} teams
                      </span>
                    </div>
                    <ActionButton
                      action={archiveGameAction}
                      fields={{ gameId: g.id, archived: g.status === "ARCHIVED" ? "false" : "true" }}
                      label={g.status === "ARCHIVED" ? "Restore" : "Archive"}
                      confirm={g.status === "ARCHIVED" ? undefined : `Archive ${g.name}? Its community and teams become read-only.`}
                    />
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-accent">Rename</summary>
                    <div className="mt-2 max-w-sm">
                      <ServerForm action={renameGameAction} hidden={{ gameId: g.id }} submitLabel="Save name" fields={[{ label: "New name", name: "name", defaultValue: g.name }]} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
