import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getTeamPage } from "@/server/services/team-service";
import { leaveTeamAction } from "@/app/actions/teams";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { TeamTabs } from "@/components/team-tabs";
import { Empty, NoAccess, PageHeader, Section, TeamStatusBadge, fmtDate } from "@/components/ui";

export const metadata: Metadata = { title: "Team · Esports Hub" };

// Team page: visible to its Players, the game's Managers and Admins (baseline C6, UC-13 extension).
export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getTeamPage(ctx, teamId));
  if (res.forbidden) return <NoAccess what="this team" />;
  const { team, roster, canManage, isOnTeam } = res.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={team.name}
        subtitle={
          <>
            <Link href={`/games/${team.game.slug}`} className="underline">
              {team.game.name}
            </Link>
            {team.season && <> · {team.season}</>} · <TeamStatusBadge status={team.status} />
          </>
        }
        actions={
          <>
            {canManage && (
              <Link href={`/manage/teams/${team.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
                Manage
              </Link>
            )}
            {isOnTeam && <ActionButton action={leaveTeamAction} fields={{ teamId: team.id }} label="Leave team" confirm={`Leave ${team.name}?`} />}
          </>
        }
      />
      <TeamTabs teamId={team.id} active="roster" />
      <Section title={`Roster (${roster.length}${team.maxRosterSize ? ` / ${team.maxRosterSize}` : ""})`}>
        {roster.length === 0 ? (
          <Empty>No players yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {roster.map((p) => (
              <li key={p.userId} className="flex justify-between py-2 text-sm">
                <Link href={`/users/${p.username}`} className="font-medium hover:underline">
                  {p.username} <span className="font-normal text-muted">({p.name})</span>
                </Link>
                <span className="text-muted">since {fmtDate(p.joinedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
