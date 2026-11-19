import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getTeamStats } from "@/server/services/stats-service";
import { guard } from "@/app/page-guard";
import { StatTable } from "@/components/stat-table";
import { TeamShell } from "@/components/team-shell";
import { Empty, NoAccess, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Team stats · Esports Hub" };

// FREQ46 view, FREQ43 calculated stats (ƒ columns).
export default async function TeamStatsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getTeamStats(ctx, teamId));
  if (res.forbidden) return <NoAccess what="this team's stats" />;
  const s = res.data;
  const teamDefs = s.defs.filter((d) => d.level === "TEAM");
  const playerDefs = s.defs.filter((d) => d.level === "PLAYER");
  const playerInputs = playerDefs.filter((d) => d.kind === "INPUT");

  return (
    <TeamShell
      team={s.team}
      active="stats"
      actions={
        s.canManage &&
        s.defs.length > 0 && (
          <Link href={`/teams/${teamId}/stats/new`} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg">
            Enter match stats
          </Link>
        )
      }
    >
      {s.defs.length === 0 ? (
        <Empty>Stats haven&apos;t been set up for {s.team.game.name} yet. An Admin can add them under Admin → Games.</Empty>
      ) : s.sheets.length === 0 ? (
        <Empty>No stats recorded yet.</Empty>
      ) : (
        <>
          {teamDefs.length > 0 && (
            <Section title={`Team totals · ${s.teamSummary.games} match${s.teamSummary.games === 1 ? "" : "es"}`}>
              <StatTable
                defs={teamDefs}
                firstColumn=""
                rows={[
                  { key: "total", label: "Total", values: s.teamSummary.totals },
                  { key: "avg", label: "Per match", values: s.teamSummary.averages },
                ]}
              />
            </Section>
          )}
          {playerDefs.length > 0 && (
            <Section title="Players · season totals">
              <StatTable
                defs={playerDefs}
                firstColumn="Player"
                extraColumn="Games"
                rows={s.players.map((p) => ({ key: p.user.id, label: p.user.username, extra: p.games, values: p.totals }))}
              />
              {playerInputs.length > 0 && (
                <>
                  <h3 className="mb-2 mt-6 text-sm font-semibold">Per-game averages</h3>
                  <StatTable
                    defs={playerInputs.map((d) => ({ ...d, precision: Math.max(1, d.precision) }))}
                    firstColumn="Player"
                    rows={s.players.map((p) => ({ key: p.user.id, label: p.user.username, values: p.averages }))}
                  />
                </>
              )}
            </Section>
          )}
          <Section title="Matches">
            <StatTable
              defs={teamDefs}
              firstColumn="Match"
              rows={s.sheets.map((sh) => ({
                key: sh.id,
                label: (
                  <Link href={`/teams/${teamId}/stats/${sh.id}`} className="text-accent underline">
                    {sh.title} <span className="font-normal text-muted">· {formatDateTime(sh.playedAt)}</span>
                  </Link>
                ),
                values: sh.teamRow,
              }))}
            />
          </Section>
        </>
      )}
    </TeamShell>
  );
}
