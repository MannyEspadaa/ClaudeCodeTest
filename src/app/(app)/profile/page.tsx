import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { getOwnProfile } from "@/server/services/account-service";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile · Esports Hub" };

// UC-2 / FREQ6 view, FREQ49 edit.
export default async function ProfilePage() {
  const { user } = await requireUser();
  const profile = await getOwnProfile(user.id);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <h1 className="text-3xl font-semibold">Your profile</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-5 text-sm">
        <dt className="text-muted">Email</dt>
        <dd>{profile.email}</dd>
        <dt className="text-muted">Member since</dt>
        <dd>{profile.createdAt.toLocaleDateString("en-US", { dateStyle: "long" })}</dd>
        <dt className="text-muted">Public profile</dt>
        <dd>/users/{profile.username}</dd>
      </dl>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Edit details</h2>
        <ProfileForm fullName={profile.fullName} username={profile.username} />
        <p className="mt-4 text-xs text-muted">Your school email can only be changed by an administrator.</p>
      </section>
    </div>
  );
}
