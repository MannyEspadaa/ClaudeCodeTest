import { addCommentAction, deleteCommentAction } from "@/app/actions/team-data";
import { ActionButton } from "./action-button";
import { ServerForm } from "./server-form";
import { Empty, Section } from "./ui";
import { formatDateTime } from "@/lib/time";

type Author = { id: string; username: string } | null;
type C = { id: string; body: string; createdAt: Date; author: Author };
type Thread = C & { replies: C[] };

/** FREQ31 / FREQ62 comment threads on a VOD or stat sheet. */
export function Comments({
  targetType,
  targetId,
  data,
  viewerId,
}: {
  targetType: "VOD" | "STAT_SHEET";
  targetId: string;
  data: { canStart: boolean; canReply: boolean; canModerate: boolean; threads: Thread[] };
  viewerId: string;
}) {
  const canDelete = (c: C) => data.canModerate || c.author?.id === viewerId;
  const hidden = { targetType, targetId };
  const Body = ({ c }: { c: C }) => (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-fg">{c.author?.username ?? "Removed user"}</span>
        <span>{formatDateTime(c.createdAt)}</span>
        {canDelete(c) && <ActionButton action={deleteCommentAction} fields={{ commentId: c.id }} label="Delete" confirm="Delete this comment?" />}
      </div>
      <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
    </div>
  );
  return (
    <Section title={`Coach notes (${data.threads.length})`}>
      <div className="flex flex-col gap-5">
        {data.threads.length === 0 && <Empty>No notes yet.</Empty>}
        {data.threads.map((t) => (
          <article key={t.id} className="rounded-lg border border-border p-3">
            <Body c={t} />
            {t.replies.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
                {t.replies.map((r) => (
                  <li key={r.id}>
                    <Body c={r} />
                  </li>
                ))}
              </ul>
            )}
            {data.canReply && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-accent">Reply</summary>
                <div className="mt-2">
                  <ServerForm action={addCommentAction} hidden={{ ...hidden, parentId: t.id }} submitLabel="Reply" resetOnSuccess fields={[{ label: "Reply", name: "body", rows: 2 }]} />
                </div>
              </details>
            )}
          </article>
        ))}
        {data.canStart && (
          <ServerForm action={addCommentAction} hidden={hidden} submitLabel="Add note" resetOnSuccess fields={[{ label: "New note for the team", name: "body", rows: 3 }]} />
        )}
      </div>
    </Section>
  );
}
