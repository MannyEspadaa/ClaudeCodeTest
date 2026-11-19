import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listManagedGames } from "@/server/services/team-service";
import { createTeamAction } from "@/app/actions/teams";
import { ServerForm } from "@/components/server-form";
import { Badge, Empty, NoAccess, PageHeader, Section, TeamStatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Team management · Esports Hub" };

// FREQ44: team management page for the games a Game Manager is assigned to (all games for Admins).
export default async function ManagePage() {
  const { ctx } = await requireUser();
  if (!ctx.isAdmin && ctx.managedGameIds.size === 0) return <NoAccess what="team management" />;
  const games = await listManagedGames(ctx);

  return (
    <>
      <PageHeader
        title="Team management"
        subtitle="Create teams, review roster requests and manage players."
        actions={
          <>
            <Link href="/manage/schedule" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              Schedules & events
            </Link>
            <Link href="/announcements" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              Announcements
            </Link>
          </>
        }
      />
      {games.length === 0 && <Empty>No games yet. An Admin can add games under Admin → Games.</Empty>}
      <div className="flex flex-col gap-6">
        {games.map((g) => (
          <Section
            key={g.id}
            title={g.name}
            actions={
              <div className="flex items-center gap-2">
                {g.status === "ARCHIVED" && <Badge tone="danger">Archived</Badge>}
                <Link href={`/games/${g.slug}`} className="text-sm text-accent underline">
                  Community page
                </Link>
              </div>
            }
          >
            {g.teams.length === 0 ? (
              <Empty>No teams yet.</Empty>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="py-2 font-medium">Team</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Roster</th>
                    <th className="py-2 font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {g.teams.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2">
                        <Link href={`/manage/teams/${t.id}`} className="font-medium text-accent underline">
                          {t.name}
                        </Link>
                        {t.season && <span className="text-muted"> · {t.season}</span>}
                      </td>
                      <td className="py-2">
                        <TeamStatusBadge status={t.status} />
                      </td>
                      <td className="py-2">
                        {t.rosterCount}
                        {t.maxRosterSize ? ` / ${t.maxRosterSize}` : ""}
                      </td>
                      <td className="py-2">{t.pendingRequests > 0 ? <Badge tone="accent">{t.pendingRequests} pending</Badge> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {g.status === "ACTIVE" && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-accent">New team</summary>
                <div className="mt-3">
                  <ServerForm
                    action={createTeamAction}
                    hidden={{ gameId: g.id }}
                    submitLabel="Create team"
                    resetOnSuccess
                    layout="grid"
                    fields={[
                      { label: "Team name", name: "name" },
                      { label: "Season", name: "season", required: false, hint: "Optional, e.g. Fall 2026" },
                      { label: "Max roster size", name: "maxRosterSize", type: "number", required: false, hint: "Leave blank for no limit" },
                    ]}
                  />
                </div>
              </details>
            )}
          </Section>
        ))}
      </div>
    </>
  );
}
