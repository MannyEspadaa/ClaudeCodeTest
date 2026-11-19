import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { getOwnProfile } from "@/server/services/account-service";
import { getMemberships } from "@/server/services/community-service";
import { MembershipList } from "@/components/memberships";
import { Section } from "@/components/ui";
import { getDiscordUsername } from "@/server/services/discord-service";
import { getFeedStatus } from "@/server/services/feed-service";
import { getConfig } from "@/server/config";
import { DiscordPanel, FeedPanel } from "@/components/integrations";
import { ProfileForm } from "./profile-form";

const DISCORD_NOTICE: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "Discord linked." },
  cancelled: { ok: false, text: "Discord linking was cancelled." },
  taken: { ok: false, text: "That Discord account is already linked to another user." },
  error: { ok: false, text: "Discord authentication failed. Please try again." },
  disabled: { ok: false, text: "Discord linking isn't configured." },
};

export const metadata: Metadata = { title: "Your profile · Esports Hub" };

// UC-2 / FREQ6 view, FREQ49 edit.
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  const notice = DISCORD_NOTICE[(await searchParams).discord ?? ""];
  const { user } = await requireUser();
  const [profile, memberships, discord, feed] = await Promise.all([
    getOwnProfile(user.id),
    getMemberships(user.id),
    getDiscordUsername(user.id),
    getFeedStatus(user.id),
  ]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <h1 className="text-3xl font-semibold">Your profile</h1>
      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`rounded-md border px-3 py-2 text-sm ${notice.ok ? "border-ok/40 text-ok" : "border-danger/40 text-danger"}`}>
          {notice.text}
        </p>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-5 text-sm">
        <dt className="text-muted">Email</dt>
        <dd>{profile.email}</dd>
        <dt className="text-muted">Member since</dt>
        <dd>{profile.createdAt.toLocaleDateString("en-US", { dateStyle: "long" })}</dd>
        <dt className="text-muted">Discord</dt>
        <dd>{discord ?? "Not linked"}</dd>
        <dt className="text-muted">Public profile</dt>
        <dd>/users/{profile.username}</dd>
      </dl>
      <Section title="Communities & teams">
        <MembershipList data={memberships} linkTeams={() => true} />
      </Section>
      <Section title="Discord">
        <DiscordPanel username={discord} configured={!!getConfig().discord} />
      </Section>
      <Section title="Calendar subscription">
        <FeedPanel active={!!feed} />
      </Section>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Edit details</h2>
        <ProfileForm fullName={profile.fullName} username={profile.username} />
        <p className="mt-4 text-xs text-muted">Your school email can only be changed by an administrator.</p>
      </section>
    </div>
  );
}
