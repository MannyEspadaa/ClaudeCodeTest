import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { getSheet } from "@/server/services/stats-service";
import { listComments } from "@/server/services/comment-service";
import { deleteSheetAction } from "@/app/actions/team-data";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { Comments } from "@/components/comments";
import { StatTable } from "@/components/stat-table";
import { TeamShell } from "@/components/team-shell";
import { NoAccess, Section } from "@/components/ui";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Match stats · Esports Hub" };

export default async function SheetPage({ params }: { params: Promise<{ teamId: string; sheetId: string }> }) {
  const { teamId, sheetId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(async () => ({ ...(await getSheet(ctx, sheetId)), comments: await listComments(ctx, "STAT_SHEET", sheetId) }));
  if (res.forbidden) return <NoAccess what="these stats" />;
  const d = res.data;
  if (d.sheet.teamId !== teamId) notFound();
  const teamDefs = d.defs.filter((x) => x.level === "TEAM");
  const playerDefs = d.defs.filter((x) => x.level === "PLAYER");

  return (
    <TeamShell
      team={d.team}
      active="stats"
      actions={
        d.canManage && (
          <>
            <Link href={`/teams/${teamId}/stats/${sheetId}/edit`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              Edit
            </Link>
            <ActionButton action={deleteSheetAction} fields={{ sheetId, teamId }} label="Delete" variant="danger" confirm="Delete these stats and their notes?" />
          </>
        )
      }
    >
      <Section title={`${d.sheet.title} · ${formatDateTime(d.sheet.playedAt)}`}>
        <div className="flex flex-col gap-6">
          {teamDefs.length > 0 && <StatTable defs={teamDefs} firstColumn="" rows={[{ key: "team", label: d.team.name, values: d.teamRow }]} />}
          {playerDefs.length > 0 && (
            <StatTable defs={playerDefs} firstColumn="Player" rows={d.playerRows.map((p) => ({ key: p.user.id, label: p.user.username, values: p.row }))} />
          )}
          <p className="text-xs text-muted">Entered by {d.sheet.enteredBy?.username ?? "removed user"} · ƒ = calculated</p>
        </div>
      </Section>
      <Comments targetType="STAT_SHEET" targetId={sheetId} data={d.comments} viewerId={ctx.userId} />
    </TeamShell>
  );
}
