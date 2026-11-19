import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";

// Public landing page. The public calendar (NFREQ8) is added here in Phase 3.
export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <section className="flex flex-col items-start gap-6 py-10">
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
  );
}
