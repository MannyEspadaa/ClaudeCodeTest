import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getTeamPage } from "@/server/services/team-service";
import { listCalendarItems } from "@/server/services/calendar-service";
import { guard } from "@/app/page-guard";
import { Agenda } from "@/components/calendar";
import { TeamTabs } from "@/components/team-tabs";
import { NoAccess, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Team schedule · Esports Hub" };

export default async function TeamSchedulePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getTeamPage(ctx, teamId));
  if (res.forbidden) return <NoAccess what="this team" />;
  const { team, canManage } = res.data;
  const now = Date.now();
  const [upcoming, past] = await Promise.all([
    listCalendarItems(ctx, { teamId, from: new Date(now), to: new Date(now + 120 * 86_400_000) }),
    listCalendarItems(ctx, { teamId, from: new Date(now - 60 * 86_400_000), to: new Date(now) }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={team.name}
        subtitle={team.game.name}
        actions={
          canManage && (
            <Link href="/manage/schedule" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              Manage schedule
            </Link>
          )
        }
      />
      <TeamTabs teamId={team.id} active="schedule" />
      <Section title="Upcoming">
        <Agenda items={upcoming} empty="Nothing scheduled." />
      </Section>
      <Section title="Last 60 days">
        <Agenda items={past.reverse()} empty="No recent entries." />
      </Section>
    </div>
  );
}
