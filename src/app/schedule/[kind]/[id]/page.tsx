import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/current-user";
import { getCalendarItem } from "@/server/services/calendar-service";
import { guard } from "@/app/page-guard";
import { Badge, Section } from "@/components/ui";
import { formatDateTime, formatTime, localDayKey, zoneLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Schedule · Esports Hub" };

// FREQ19 event details; public items are viewable by logged-out visitors.
export default async function ItemPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "event" && kind !== "schedule") notFound();
  const actor = await getActor();
  const res = await guard(() => getCalendarItem(actor, kind, id));
  if (res.forbidden) notFound();
  const d = res.data;
  const item = d.item;
  const title = d.kind === "event" ? d.item.name : d.item.displayTitle;
  const sameDay = localDayKey(item.startsAt) === localDayKey(item.endsAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {d.kind === "event" ? <Badge tone="accent">Event</Badge> : <Badge tone="ok">{d.item.type.toLowerCase()}</Badge>}
          {item.visibility === "TEAM" && <Badge>Team only</Badge>}
          {item.visibility === "MEMBERS" && <Badge>Members</Badge>}
        </div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-muted">
          {formatDateTime(item.startsAt)} – {sameDay ? formatTime(item.endsAt) : formatDateTime(item.endsAt)} ({zoneLabel(item.startsAt)})
        </p>
      </header>
      <Section title="Details">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Game</dt>
          <dd>{item.game ? <Link href={`/games/${item.game.slug}`} className="underline">{item.game.name}</Link> : "Program-wide"}</dd>
          {d.kind === "schedule" && d.item.team && (
            <>
              <dt className="text-muted">Team</dt>
              <dd>{d.item.team.name}</dd>
            </>
          )}
          {d.kind === "schedule" && d.item.opponent && (
            <>
              <dt className="text-muted">Opponent</dt>
              <dd>{d.item.opponent}</dd>
            </>
          )}
          <dt className="text-muted">Location</dt>
          <dd>{item.location ?? "TBA"}</dd>
          {d.kind === "schedule" && d.item.result && (
            <>
              <dt className="text-muted">Result</dt>
              <dd>{d.item.result}</dd>
            </>
          )}
        </dl>
        {d.kind === "event" && d.item.description && <p className="mt-4 whitespace-pre-line text-sm">{d.item.description}</p>}
      </Section>
      <div className="flex gap-3 text-sm">
        <Link href={actor ? "/calendar" : "/"} className="text-accent underline">
          Back to calendar
        </Link>
        {d.canEdit && (
          <Link href={`/manage/schedule/${d.kind}/${item.id}`} className="text-accent underline">
            Edit
          </Link>
        )}
      </div>
    </div>
  );
}
