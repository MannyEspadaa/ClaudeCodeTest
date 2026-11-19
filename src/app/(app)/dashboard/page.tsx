import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { authorize } from "@/server/authz/context";

export const metadata: Metadata = { title: "Dashboard · Esports Hub" };

// FREQ10. Panels are filled in as later phases land (communities & teams: Phase 2, schedule: Phase 3).
export default async function DashboardPage() {
  const { user, ctx } = await requireUser();
  authorize(ctx, "dashboard.view", { type: "global" });
  const firstName = user.fullName.split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold">Welcome back, {firstName}</h1>
        {user.isAdmin && <p className="mt-1 text-sm text-muted">You are signed in as an Administrator.</p>}
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Upcoming">No upcoming events or matches yet.</Panel>
        <Panel title="My communities & teams">
          You haven&apos;t joined any game communities yet.
        </Panel>
        <Panel title="Announcements">Nothing new.</Panel>
        <Panel title="Account">
          <Link href="/profile" className="text-accent underline">
            View and edit your profile
          </Link>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="text-sm text-muted">{children}</div>
    </section>
  );
}
