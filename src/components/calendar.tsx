import Link from "next/link";
import type { CalendarItem } from "@/server/services/calendar-service";
import { addDaysKey, formatDayHeading, formatTime, localDayKey } from "@/lib/time";
import { Badge, Empty } from "./ui";

const TYPE_LABEL = { MATCH: "Match", SCRIM: "Scrim", PRACTICE: "Practice", OTHER: "Session" } as const;

export function itemHref(i: Pick<CalendarItem, "kind" | "id">) {
  return `/schedule/${i.kind}/${i.id}`;
}

function KindBadge({ item }: { item: CalendarItem }) {
  if (item.kind === "event") return <Badge tone="accent">Event</Badge>;
  return <Badge tone={item.type === "MATCH" ? "ok" : "neutral"}>{TYPE_LABEL[item.type!]}</Badge>;
}

/** Items grouped by local day. */
export function Agenda({ items, empty = "Nothing scheduled." }: { items: CalendarItem[]; empty?: string }) {
  if (items.length === 0) return <Empty>{empty}</Empty>;
  const days = new Map<string, CalendarItem[]>();
  for (const i of items) {
    const k = localDayKey(i.startsAt);
    days.set(k, [...(days.get(k) ?? []), i]);
  }
  return (
    <ol className="flex flex-col gap-5">
      {[...days].map(([key, list]) => (
        <li key={key}>
          <h3 className="mb-2 text-sm font-semibold text-muted">{formatDayHeading(key)}</h3>
          <ul className="flex flex-col gap-2">
            {list.map((i) => (
              <li key={`${i.kind}-${i.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2">
                <span className="w-32 shrink-0 text-sm tabular-nums text-muted">
                  {formatTime(i.startsAt)}–{formatTime(i.endsAt)}
                </span>
                <Link href={itemHref(i)} className="font-medium hover:underline">
                  {i.title}
                </Link>
                <KindBadge item={i} />
                <span className="text-sm text-muted">
                  {[i.game?.name ?? "Program-wide", i.location].filter(Boolean).join(" · ")}
                </span>
                {i.visibility === "TEAM" && <Badge>Team only</Badge>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month grid; `month` is "YYYY-MM". Hidden on small screens in favour of the agenda. */
export function MonthGrid({ month, items }: { month: string; items: CalendarItem[] }) {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = addDaysKey(first, -firstWeekday);
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) {
    const k = localDayKey(i.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), i]);
  }
  const today = localDayKey(new Date());
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border md:block">
      <div className="grid grid-cols-7 border-b border-border bg-surface text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, n) => {
          const key = addDaysKey(start, n);
          const inMonth = key.startsWith(month);
          const list = byDay.get(key) ?? [];
          return (
            <div key={key} className={`min-h-24 border-b border-r border-border p-1.5 text-xs ${inMonth ? "bg-surface" : "bg-bg text-muted"}`}>
              <div className={`mb-1 font-medium ${key === today ? "inline-block rounded-full bg-accent px-1.5 text-accent-fg" : ""}`}>{Number(key.slice(8))}</div>
              <ul className="flex flex-col gap-0.5">
                {list.slice(0, 3).map((i) => (
                  <li key={`${i.kind}-${i.id}`} className="truncate">
                    <Link href={itemHref(i)} className="hover:underline" title={i.title}>
                      <span className="tabular-nums text-muted">{formatTime(i.startsAt)}</span> {i.title}
                    </Link>
                  </li>
                ))}
                {list.length > 3 && <li className="text-muted">+{list.length - 3} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
