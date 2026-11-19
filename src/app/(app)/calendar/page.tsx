import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listCalendarItems } from "@/server/services/calendar-service";
import { listGames } from "@/server/services/game-service";
import { Agenda, MonthGrid } from "@/components/calendar";
import { PageHeader } from "@/components/ui";
import { addDaysKey, localDayKey, startOfLocalDay, zoneLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Calendar · Esports Hub" };

function monthKey(param: string | undefined) {
  return param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : localDayKey(new Date()).slice(0, 7);
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

// FREQ18, 19 (everyone's view) and FREQ38 (personal calendar for the user's games and teams).
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; view?: string; game?: string }> }) {
  const sp = await searchParams;
  const { ctx } = await requireUser();
  const month = monthKey(sp.month);
  const view = sp.view === "all" ? "all" : "mine";
  const games = await listGames(ctx);
  const game = games.find((g) => g.slug === sp.game);
  const from = startOfLocalDay(`${month}-01`);
  const to = startOfLocalDay(addDaysKey(`${shiftMonth(month, 1)}-01`, 0));
  const items = await listCalendarItems(ctx, { from, to, mine: view === "mine" && !game, gameId: game?.id });
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ month, view, game: game?.slug, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/calendar?${p}`;
  };

  return (
    <>
      <PageHeader title="Calendar" subtitle={`All times ${zoneLabel()}`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Month" className="flex items-center gap-2">
          <Link href={link({ month: shiftMonth(month, -1) })} className="rounded-md border border-border px-2 py-1" aria-label="Previous month">
            ←
          </Link>
          <span className="min-w-36 text-center font-semibold">{label}</span>
          <Link href={link({ month: shiftMonth(month, 1) })} className="rounded-md border border-border px-2 py-1" aria-label="Next month">
            →
          </Link>
        </nav>
        <nav aria-label="Calendar filter" className="flex flex-wrap gap-2 text-sm">
          <Link href={link({ view: "mine", game: undefined })} aria-current={view === "mine" && !game ? "page" : undefined} className="rounded-full border border-border px-3 py-1 aria-[current]:border-accent aria-[current]:text-accent">
            My games & teams
          </Link>
          <Link href={link({ view: "all", game: undefined })} aria-current={view === "all" && !game ? "page" : undefined} className="rounded-full border border-border px-3 py-1 aria-[current]:border-accent aria-[current]:text-accent">
            Everything
          </Link>
          {games.map((g) => (
            <Link key={g.id} href={link({ game: g.slug })} aria-current={game?.id === g.id ? "page" : undefined} className="rounded-full border border-border px-3 py-1 aria-[current]:border-accent aria-[current]:text-accent">
              {g.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-8">
        <MonthGrid month={month} items={items} />
        <section aria-label="Agenda">
          <Agenda items={items} empty="Nothing scheduled this month." />
        </section>
      </div>
    </>
  );
}
