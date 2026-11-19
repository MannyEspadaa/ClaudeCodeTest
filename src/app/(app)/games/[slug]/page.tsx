import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getCommunityPage } from "@/server/services/community-service";
import { listCalendarItems } from "@/server/services/calendar-service";
import { listAnnouncements } from "@/server/services/announcement-service";
import { Agenda } from "@/components/calendar";
import { AnnouncementList } from "@/components/announcements";
import {
  cancelRequestAction,
  joinCommunityAction,
  leaveCommunityAction,
  leaveTeamAction,
  requestJoinAction,
} from "@/app/actions/teams";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { Badge, Empty, PageHeader, Section, TeamStatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Community · Esports Hub" };

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getCommunityPage(ctx, slug));
  if (res.forbidden) return null; // getCommunityPage never forbids; it limits what it returns
  const page = res.data;
  const archived = page.game.status === "ARCHIVED";
  const now = new Date();
  const [upcoming, news] = await Promise.all([
    listCalendarItems(ctx, { from: now, to: new Date(now.getTime() + 30 * 86_400_000), gameId: page.game.id, limit: 10 }),
    listAnnouncements(ctx, { gameId: page.game.id, limit: 5 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={page.game.name}
        subtitle={
          <>
            {page.memberCount} member{page.memberCount === 1 ? "" : "s"}
            {page.managers.length > 0 && <> · Managed by {page.managers.join(", ")}</>}
            {archived && <> · <Badge tone="danger">Archived</Badge></>}
          </>
        }
        actions={
          <>
            {page.canManage && (
              <Link href="/manage" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
                Manage teams
              </Link>
            )}
            {!archived &&
              (page.isMember ? (
                <ActionButton
                  action={leaveCommunityAction}
                  fields={{ gameId: page.game.id }}
                  label="Leave community"
                  confirm="Leave this community? You'll also be removed from its teams."
                />
              ) : (
                <ActionButton action={joinCommunityAction} fields={{ gameId: page.game.id }} label="Join community" variant="primary" />
              ))}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Upcoming (30 days)">
          <Agenda items={upcoming} empty="Nothing scheduled." />
        </Section>
        <Section title="Announcements">
          {page.canView ? <AnnouncementList items={news} compact /> : <p className="text-sm text-muted">Join to see announcements.</p>}
        </Section>
      </div>

      {!page.canView ? (
        <Section title="Teams">
          <Empty>Join this community to see its teams and request a roster spot.</Empty>
        </Section>
      ) : (
        <Section title="Teams">
          {page.teams.length === 0 ? (
            <Empty>No teams yet.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {page.teams.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {t.isOnTeam || page.canManage ? (
                        <Link href={`/teams/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{t.name}</span>
                      )}
                      <TeamStatusBadge status={t.status} />
                      {t.isOnTeam && <Badge tone="ok">Your team</Badge>}
                    </div>
                    <span className="text-sm text-muted">
                      {t.rosterCount}
                      {t.maxRosterSize ? ` / ${t.maxRosterSize}` : ""} players{t.season ? ` · ${t.season}` : ""}
                    </span>
                  </div>
                  {!archived &&
                    (t.isOnTeam ? (
                      <ActionButton action={leaveTeamAction} fields={{ teamId: t.id }} label="Leave team" confirm={`Leave ${t.name}?`} />
                    ) : t.pendingRequestId ? (
                      <div className="flex items-center gap-2">
                        <Badge tone="accent">Request pending</Badge>
                        <ActionButton action={cancelRequestAction} fields={{ requestId: t.pendingRequestId }} label="Cancel" />
                      </div>
                    ) : t.isFull ? (
                      <Badge>Roster full</Badge>
                    ) : (
                      <ActionButton action={requestJoinAction} fields={{ teamId: t.id }} label="Request to join" variant="primary" />
                    ))}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
