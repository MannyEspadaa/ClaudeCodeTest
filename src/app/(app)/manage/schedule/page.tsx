import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { listManagedGames } from "@/server/services/team-service";
import { listCalendarItems } from "@/server/services/calendar-service";
import { createEntryAction, createEventAction } from "@/app/actions/schedule";
import { ServerForm } from "@/components/server-form";
import { eventFields, entryFields } from "@/components/schedule-fields";
import { Agenda } from "@/components/calendar";
import { NoAccess, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Schedules & events · Esports Hub" };

// UC-4 / UC-5: Game Managers and Admins create events and schedule entries.
export default async function ManageSchedulePage() {
  const { ctx } = await requireUser();
  if (!ctx.isAdmin && ctx.managedGameIds.size === 0) return <NoAccess what="schedule management" />;
  const games = (await listManagedGames(ctx)).filter((g) => g.status === "ACTIVE");
  const from = new Date();
  const to = new Date(from.getTime() + 60 * 86_400_000);

  const upcomingByGame = await Promise.all(games.map((g) => listCalendarItems(ctx, { from, to, gameId: g.id })));
  const globalUpcoming = ctx.isAdmin ? (await listCalendarItems(ctx, { from, to })).filter((i) => i.kind === "event" && !i.game) : [];

  return (
    <>
      <PageHeader title="Schedules & events" subtitle="Next 60 days. Open an item to edit or delete it." />
      <div className="flex flex-col gap-8">
        {ctx.isAdmin && (
          <Section title="Program-wide events">
            <Agenda items={globalUpcoming} empty="No upcoming program-wide events." />
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-accent">New program-wide event</summary>
              <div className="mt-3">
                <ServerForm action={createEventAction} submitLabel="Create event" resetOnSuccess layout="grid" fields={eventFields()} />
              </div>
            </details>
          </Section>
        )}
        {games.map((g, idx) => (
          <Section key={g.id} title={g.name}>
            <Agenda items={upcomingByGame[idx]} empty="Nothing scheduled in the next 60 days." />
            <div className="mt-4 flex flex-col gap-3">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-accent">Add to schedule (match, scrim, practice)</summary>
                <div className="mt-3">
                  <ServerForm
                    action={createEntryAction}
                    hidden={{ gameId: g.id }}
                    submitLabel="Add to schedule"
                    resetOnSuccess
                    layout="grid"
                    fields={entryFields(g.teams.filter((t) => t.status !== "ARCHIVED"))}
                  />
                </div>
              </details>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-accent">New {g.name} event</summary>
                <div className="mt-3">
                  <ServerForm action={createEventAction} hidden={{ gameId: g.id }} submitLabel="Create event" resetOnSuccess layout="grid" fields={eventFields()} />
                </div>
              </details>
            </div>
          </Section>
        ))}
      </div>
    </>
  );
}
