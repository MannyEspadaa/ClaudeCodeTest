import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { authorize } from "@/server/authz/context";
import { can } from "@/server/authz/policy";
import { db } from "@/server/db";
import { getPublicProfile } from "@/server/services/account-service";
import { getMemberships } from "@/server/services/community-service";
import { MembershipList } from "@/components/memberships";
import { Section } from "@/components/ui";

export const metadata: Metadata = { title: "Profile · Esports Hub" };

// FREQ9: other users' profiles. Full name/email only per baseline C6.
export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { ctx } = await requireUser();

  const target = await db.user.findUnique({ where: { usernameKey: username.toLowerCase() }, select: { id: true } });
  if (!target) notFound();
  const memberships = await getMemberships(target.id);
  const resource = { type: "user" as const, userId: target.id, gameIds: memberships.communities.map((c) => c.id) };
  authorize(ctx, "profile.view", resource);

  const profile = await getPublicProfile(username, { includePii: can(ctx, "profile.viewPii", resource) });
  if (!profile) notFound();
  const linkTeams = (t: { id: string; game: { id: string } }) => can(ctx, "team.view", { type: "team", teamId: t.id, gameId: t.game.id });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold">{profile.username}</h1>
        <p className="text-muted">{profile.fullName ?? profile.firstName}</p>
      </header>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-5 text-sm">
        {profile.email && (
          <>
            <dt className="text-muted">Email</dt>
            <dd>{profile.email}</dd>
          </>
        )}
        <dt className="text-muted">Member since</dt>
        <dd>{profile.memberSince.toLocaleDateString("en-US", { dateStyle: "long" })}</dd>
      </dl>
      <Section title="Communities & teams">
        <MembershipList data={memberships} linkTeams={linkTeams} />
      </Section>
    </div>
  );
}
