import "server-only";
import { getSheetForm } from "@/server/services/stats-service";
import { linkableEntries } from "@/server/services/vod-service";
import type { AuthzContext } from "@/server/authz/policy";
import { StatSheetForm } from "@/components/stat-sheet-form";
import { TeamShell } from "@/components/team-shell";
import { Empty, NoAccess, Section } from "@/components/ui";
import { formatDateTime, toLocalInput } from "@/lib/time";
import { guard } from "./page-guard";

/** Shared body of the "enter stats" and "edit stats" pages. */
export async function SheetFormPage({ ctx, teamId, sheetId }: { ctx: AuthzContext; teamId: string; sheetId?: string }) {
  const res = await guard(async () => ({ form: await getSheetForm(ctx, teamId, sheetId), entries: await linkableEntries(ctx, teamId) }));
  if (res.forbidden) return <NoAccess what="stat entry for this team" />;
  const { form, entries } = res.data;
  return (
    <TeamShell team={form.team} active="stats">
      <Section title={sheetId ? "Edit match stats" : "Enter match stats"}>
        {form.defs.length === 0 ? (
          <Empty>An Admin needs to set up stats for {form.team.game.name} first.</Empty>
        ) : (
          <StatSheetForm
            teamId={teamId}
            defs={form.defs.map((d) => ({ key: d.key, label: d.label, level: d.level }))}
            players={form.players}
            entries={entries.map((e) => ({ id: e.id, label: `${formatDateTime(e.startsAt)}${e.opponent ? ` vs ${e.opponent}` : ""}` }))}
            initial={form.sheet ? { ...form.sheet, playedAt: toLocalInput(form.sheet.playedAt) } : undefined}
          />
        )}
      </Section>
    </TeamShell>
  );
}
