import Link from "next/link";
import type { FormState } from "@/app/actions/form-state";
import { ActionButton } from "./action-button";
import { Badge, Empty } from "./ui";
import { formatDateTime } from "@/lib/time";

type Item = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  game: { name: string; slug: string } | null;
  author: { username: string } | null;
  canDelete: boolean;
};

export function AnnouncementList({
  items,
  deleteAction,
  compact = false,
}: {
  items: Item[];
  deleteAction?: (p: FormState, f: FormData) => Promise<FormState>;
  compact?: boolean;
}) {
  if (items.length === 0) return <Empty>No announcements.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id} className={compact ? "" : "rounded-xl border border-border bg-surface p-4"}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{a.title}</h3>
            {a.game ? (
              <Link href={`/games/${a.game.slug}`}>
                <Badge>{a.game.name}</Badge>
              </Link>
            ) : (
              <Badge tone="accent">Program-wide</Badge>
            )}
          </div>
          <p className={`mt-1 whitespace-pre-line text-sm ${compact ? "line-clamp-2 text-muted" : ""}`}>{a.body}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span>
              {a.author?.username ?? "Removed user"} · {formatDateTime(a.createdAt)}
            </span>
            {!compact && a.canDelete && deleteAction && (
              <ActionButton action={deleteAction} fields={{ id: a.id }} label="Delete" variant="danger" confirm="Delete this announcement?" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
