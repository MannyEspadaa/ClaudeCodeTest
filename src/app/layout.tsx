import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { logoutAction } from "@/app/actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Esports Hub",
  description: "Central hub for the esports program: communities, teams, schedules and team data.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
          Skip to content
        </a>
        <header className="border-b border-border bg-surface">
          <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link href={user ? "/dashboard" : "/"} className="font-semibold">
              Esports Hub
            </Link>
            <div className="ml-auto flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/profile">{user.username}</Link>
                  <form action={logoutAction}>
                    <button type="submit" className="text-muted hover:text-fg">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Log in</Link>
                  <Link href="/register" className="rounded-md bg-accent px-3 py-1.5 text-accent-fg">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
