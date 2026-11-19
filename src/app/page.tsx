import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPublicUpcoming } from "@/server/services/calendar-service";
import { Agenda } from "@/components/calendar";
import { zoneLabel } from "@/lib/time";

// Public landing page with the cached public calendar (NFREQ8, FREQ18/19 for visitors).
export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  const upcoming = await getPublicUpcoming();
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-6 pt-6">
        <h1 className="text-4xl font-semibold sm:text-5xl">Your esports program, in one place.</h1>
        <p className="max-w-2xl text-lg text-muted">
          Join your game&apos;s community, follow team schedules and events, and review VODs and stats with your team.
        </p>
        <div className="flex gap-3">
          <Link href="/register" className="rounded-md bg-accent px-5 py-2.5 font-medium text-accent-fg">
            Create an account
          </Link>
          <Link href="/login" className="rounded-md border border-border px-5 py-2.5 font-medium">
            Log in
          </Link>
        </div>
      </section>
      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-1 text-2xl font-semibold">
          Upcoming
        </h2>
        <p className="mb-4 text-sm text-muted">Public matches and events for the next 30 days · {zoneLabel()}</p>
        <Agenda items={upcoming} empty="No public events in the next 30 days." />
      </section>
    </div>
  );
}
