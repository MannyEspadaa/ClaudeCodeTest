import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { getCalendarItem } from "@/server/services/calendar-service";
import { db } from "@/server/db";
import { deleteItemAction, updateEntryAction, updateEventAction } from "@/app/actions/schedule";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { ServerForm } from "@/components/server-form";
import { eventFields, entryFields } from "@/components/schedule-fields";
import { NoAccess, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Edit schedule · Esports Hub" };

// FREQ15, 17, 54: edit and delete events and schedule entries.
export default async function EditItemPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "event" && kind !== "schedule") notFound();
  const { ctx } = await requireUser();
  const res = await guard(() => getCalendarItem(ctx, kind, id));
  if (res.forbidden || !res.data.canEdit) return <NoAccess what="editing this item" />;
  const d = res.data;

  const teams =
    d.kind === "schedule"
      ? await db.team.findMany({ where: { gameId: d.item.gameId, OR: [{ status: { not: "ARCHIVED" } }, { id: d.item.teamId ?? "" }] }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={d.kind === "event" ? `Edit event` : `Edit schedule entry`}
        subtitle={d.item.game?.name ?? "Program-wide"}
        actions={
          <>
            <Link href={`/schedule/${d.kind}/${id}`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              View
            </Link>
            <ActionButton action={deleteItemAction} fields={{ kind: d.kind, id }} label="Delete" variant="danger" confirm="Delete this permanently?" />
          </>
        }
      />
      <Section title="Details">
        {d.kind === "event" ? (
          <ServerForm action={updateEventAction} hidden={{ id }} submitLabel="Save event" layout="grid" fields={eventFields(d.item)} />
        ) : (
          <ServerForm action={updateEntryAction} hidden={{ id }} submitLabel="Save entry" layout="grid" fields={entryFields(teams, d.item)} />
        )}
      </Section>
    </div>
  );
}
