import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { listAnnouncements } from "@/server/services/announcement-service";
import { listManagedGames } from "@/server/services/team-service";
import { deleteAnnouncementAction, postAnnouncementAction } from "@/app/actions/schedule";
import { ServerForm } from "@/components/server-form";
import { AnnouncementList } from "@/components/announcements";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Announcements · Esports Hub" };

// FREQ63.
export default async function AnnouncementsPage() {
  const { ctx } = await requireUser();
  const [items, managed] = await Promise.all([listAnnouncements(ctx, { limit: 50 }), listManagedGames(ctx)]);
  const scopes = [
    ...(ctx.isAdmin ? [{ value: "", label: "Everyone (program-wide)" }] : []),
    ...managed.filter((g) => g.status === "ACTIVE").map((g) => ({ value: g.id, label: `${g.name} community` })),
  ];
  return (
    <>
      <PageHeader title="Announcements" />
      <div className="flex flex-col gap-6">
        {scopes.length > 0 && (
          <Section title="Post an announcement">
            <ServerForm
              action={postAnnouncementAction}
              submitLabel="Post"
              resetOnSuccess
              fields={[
                { label: "Audience", name: "gameId", options: scopes },
                { label: "Title", name: "title" },
                { label: "Message", name: "body", rows: 4 },
              ]}
            />
          </Section>
        )}
        <AnnouncementList items={items} deleteAction={deleteAnnouncementAction} />
      </div>
    </>
  );
}
