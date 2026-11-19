import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { getVod } from "@/server/services/vod-service";
import { listComments } from "@/server/services/comment-service";
import { deleteVodAction } from "@/app/actions/team-data";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { Comments } from "@/components/comments";
import { TeamShell } from "@/components/team-shell";
import { NoAccess, Section } from "@/components/ui";
import { vodEmbed } from "@/lib/vod";
import { formatDateTime } from "@/lib/time";
import { getConfig } from "@/server/config";

export const metadata: Metadata = { title: "VOD · Esports Hub" };

export default async function VodPage({ params }: { params: Promise<{ teamId: string; vodId: string }> }) {
  const { teamId, vodId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(async () => {
    const v = await getVod(ctx, vodId);
    return { ...v, comments: await listComments(ctx, "VOD", vodId) };
  });
  if (res.forbidden) return <NoAccess what="this VOD" />;
  const { vod, team, canManage, comments } = res.data;
  if (vod.teamId !== teamId) notFound();
  const embed = vodEmbed(vod.url, new URL(getConfig().appUrl).hostname);

  return (
    <TeamShell
      team={team}
      active="vods"
      actions={
        canManage && (
          <ActionButton action={deleteVodAction} fields={{ vodId: vod.id, teamId }} label="Delete VOD" variant="danger" confirm="Delete this VOD and its notes?" />
        )
      }
    >
      <Section title={vod.title}>
        {embed.embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={embed.embedUrl}
              title={vod.title}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}
        <p className="mt-3 text-sm text-muted">
          <a href={vod.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Open original
          </a>{" "}
          · added {formatDateTime(vod.createdAt)} by {vod.addedBy?.username ?? "removed user"}
        </p>
      </Section>
      <Comments targetType="VOD" targetId={vod.id} data={comments} viewerId={ctx.userId} />
    </TeamShell>
  );
}
