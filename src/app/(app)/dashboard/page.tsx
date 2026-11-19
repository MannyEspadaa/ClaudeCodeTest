import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { authorize } from "@/server/authz/context";
import { getDashboard } from "@/server/services/dashboard-service";
import { Agenda } from "@/components/calendar";
import { AnnouncementList } from "@/components/announcements";
import { MembershipList } from "@/components/memberships";
import { Badge, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard · Esports Hub" };

// FREQ10: landing page after login, tailored to the user's roles.
export default async function DashboardPage() {
  const { user, ctx } = await requireUser();
  authorize(ctx, "dashboard.view", { type: "global" });
  const d = await getDashboard(ctx);
  const firstName = user.fullName.split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Welcome back, {firstName}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {ctx.isAdmin && <Badge tone="accent">Administrator</Badge>}
          {ctx.managedGameIds.size > 0 && <Badge tone="accent">Game Manager</Badge>}
          {ctx.teamIds.size > 0 && <Badge tone="ok">Player</Badge>}
          {ctx.communityGameIds.size > 0 && <Badge>Community Member</Badge>}
        </div>
      </header>

      {(d.pendingRequests > 0 || d.adminStats) && (
        <div className="flex flex-wrap gap-4">
          {d.pendingRequests > 0 && (
            <Link href="/manage" className="rounded-xl border border-accent/40 bg-surface px-5 py-3">
              <span className="text-2xl font-semibold">{d.pendingRequests}</span>{" "}
              <span className="text-sm text-muted">roster request{d.pendingRequests === 1 ? "" : "s"} to review</span>
            </Link>
          )}
          {d.adminStats && (
            <Link href="/admin/users" className="rounded-xl border border-border bg-surface px-5 py-3 text-sm text-muted">
              <span className="text-2xl font-semibold text-fg">{d.adminStats.users}</span> active users ·{" "}
              {d.adminStats.suspended} suspended · {d.adminStats.games} games · {d.adminStats.teams} teams
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Section title="Next 14 days" actions={<Link href="/calendar" className="text-sm text-accent underline">Full calendar</Link>}>
          <Agenda items={d.upcoming} empty="Nothing scheduled for your games and teams." />
        </Section>
        <div className="flex flex-col gap-6">
          <Section
            title="My communities & teams"
            actions={<Link href="/games" className="text-sm text-accent underline">Browse games</Link>}
          >
            <MembershipList data={d.memberships} linkTeams={() => true} />
            {d.myPending > 0 && <p className="mt-3 text-sm text-muted">{d.myPending} roster request(s) awaiting a manager.</p>}
          </Section>
          <Section title="Announcements" actions={<Link href="/announcements" className="text-sm text-accent underline">All</Link>}>
            <AnnouncementList items={d.announcements} compact />
          </Section>
        </div>
      </div>
    </div>
  );
}
