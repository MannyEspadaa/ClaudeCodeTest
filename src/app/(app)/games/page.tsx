import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listGames } from "@/server/services/game-service";
import { joinCommunityAction, leaveCommunityAction } from "@/app/actions/teams";
import { ActionButton } from "@/components/action-button";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Games · Esports Hub" };

// FREQ51: browse and join Game Communities.
export default async function GamesPage() {
  const { ctx } = await requireUser();
  const games = await listGames(ctx);
  return (
    <>
      <PageHeader title="Game communities" subtitle="Join a community to see its teams and request a spot on a roster." />
      {games.length === 0 ? (
        <Empty>No games have been set up yet.</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {games.map((g) => (
            <li key={g.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/games/${g.slug}`} className="text-lg font-semibold hover:underline">
                  {g.name}
                </Link>
                <div className="flex gap-1">
                  {g.isManager && <Badge tone="accent">Manager</Badge>}
                  {g.isMember && <Badge tone="ok">Member</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted">
                {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · {g.teamCount} team{g.teamCount === 1 ? "" : "s"}
              </p>
              <div>
                {g.isMember ? (
                  <ActionButton
                    action={leaveCommunityAction}
                    fields={{ gameId: g.id }}
                    label="Leave"
                    confirm={`Leave ${g.name}? You'll also be removed from its teams.`}
                  />
                ) : (
                  <ActionButton action={joinCommunityAction} fields={{ gameId: g.id }} label="Join community" variant="primary" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
