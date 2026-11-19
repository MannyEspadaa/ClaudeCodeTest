import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { linkableEntries, listVods } from "@/server/services/vod-service";
import { addVodAction } from "@/app/actions/team-data";
import { guard } from "@/app/page-guard";
import { ServerForm } from "@/components/server-form";
import { TeamShell } from "@/components/team-shell";
import { Badge, Empty, NoAccess, Section } from "@/components/ui";
import { vodEmbed } from "@/lib/vod";
import { formatDateTime } from "@/lib/time";
import { getConfig } from "@/server/config";

export const metadata: Metadata = { title: "VODs · Esports Hub" };

// FREQ29 (GMs add) / FREQ45 (Players view).
export default async function VodsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => listVods(ctx, teamId));
  if (res.forbidden) return <NoAccess what="this team's VODs" />;
  const { team, vods, canManage } = res.data;
  const entries = canManage ? await linkableEntries(ctx, teamId) : [];
  const host = new URL(getConfig().appUrl).hostname;

  return (
    <TeamShell team={team} active="vods">
      {canManage && (
        <Section title="Add a VOD">
          <ServerForm
            action={addVodAction}
            hidden={{ teamId }}
            submitLabel="Add VOD"
            resetOnSuccess
            layout="grid"
            fields={[
              { label: "Title", name: "title" },
              { label: "Link", name: "url", type: "url", hint: "YouTube and Twitch links play inline; others open in a new tab." },
              {
                label: "Match",
                name: "scheduleEntryId",
                required: false,
                options: [{ value: "", label: "Not linked" }, ...entries.map((e) => ({ value: e.id, label: `${formatDateTime(e.startsAt)}${e.opponent ? ` vs ${e.opponent}` : ""}` }))],
              },
            ]}
          />
        </Section>
      )}
      {vods.length === 0 ? (
        <Empty>No VODs uploaded yet.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {vods.map((v) => {
            const embed = vodEmbed(v.url, host);
            return (
              <li key={v.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/teams/${teamId}/vods/${v.id}`} className="font-medium hover:underline">
                    {v.title}
                  </Link>
                  <Badge>{embed.provider}</Badge>
                </div>
                <p className="text-xs text-muted">
                  Added {formatDateTime(v.createdAt)} by {v.addedBy?.username ?? "removed user"}
                  {v.scheduleEntry && <> · match {formatDateTime(v.scheduleEntry.startsAt)}{v.scheduleEntry.opponent ? ` vs ${v.scheduleEntry.opponent}` : ""}</>}
                </p>
                <Link href={`/teams/${teamId}/vods/${v.id}`} className="text-sm text-accent underline">
                  Watch{v.commentCount ? ` · ${v.commentCount} note${v.commentCount === 1 ? "" : "s"}` : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </TeamShell>
  );
}
