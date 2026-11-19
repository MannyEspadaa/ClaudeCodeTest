import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getTeamManagement } from "@/server/services/team-service";
import {
  addPlayerAction,
  archiveTeamAction,
  decideRequestAction,
  deleteTeamAction,
  removePlayerAction,
  updateTeamAction,
} from "@/app/actions/teams";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { ServerForm } from "@/components/server-form";
import { Badge, Empty, NoAccess, PageHeader, Section, TeamStatusBadge, fmtDate } from "@/components/ui";

export const metadata: Metadata = { title: "Manage team · Esports Hub" };

// UC-7 / FREQ27, 28, 55-58 and original UC #5 (promote Community Member to Player).
export default async function ManageTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getTeamManagement(ctx, teamId));
  if (res.forbidden) return <NoAccess what="this team's management page" />;
  const { team, roster, requests, eligible } = res.data;
  const open = team.status !== "ARCHIVED" && team.game.status === "ACTIVE";
  const full = team.maxRosterSize !== null && roster.length >= team.maxRosterSize;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={team.name}
        subtitle={
          <>
            <Link href="/manage" className="underline">
              {team.game.name}
            </Link>{" "}
            · <TeamStatusBadge status={team.status} />
          </>
        }
        actions={
          <>
            <Link href={`/teams/${team.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
              Team page
            </Link>
            {team.status === "ARCHIVED" ? (
              <ActionButton action={archiveTeamAction} fields={{ teamId: team.id, archived: "false" }} label="Restore" />
            ) : (
              <ActionButton
                action={archiveTeamAction}
                fields={{ teamId: team.id, archived: "true" }}
                label="Archive"
                confirm="Archive this team? Pending requests are cancelled and the roster is frozen."
              />
            )}
            {team.status === "SHELL" && roster.length === 0 && (
              <ActionButton action={deleteTeamAction} fields={{ teamId: team.id }} label="Delete" variant="danger" confirm="Delete this shell team permanently?" />
            )}
          </>
        }
      />

      <Section title={`Join requests (${requests.length})`}>
        {requests.length === 0 ? (
          <Empty>No pending requests.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <Link href={`/users/${r.user.username}`} className="font-medium hover:underline">
                    {r.user.username}
                  </Link>{" "}
                  <span className="text-muted">
                    ({r.user.fullName}) · requested {fmtDate(r.createdAt)}
                  </span>
                </span>
                {open && (
                  <span className="flex gap-2">
                    <ActionButton action={decideRequestAction} fields={{ requestId: r.id, decision: "approve" }} label="Approve" variant="primary" />
                    <ActionButton action={decideRequestAction} fields={{ requestId: r.id, decision: "deny" }} label="Deny" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Roster (${roster.length}${team.maxRosterSize ? ` / ${team.maxRosterSize}` : ""})`}>
        {roster.length === 0 ? (
          <Empty>No players yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {roster.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <Link href={`/users/${p.username}`} className="font-medium hover:underline">
                    {p.username}
                  </Link>{" "}
                  <span className="text-muted">({p.fullName})</span>
                  {p.status !== "ACTIVE" && (
                    <>
                      {" "}
                      <Badge tone="danger">{p.status.toLowerCase()}</Badge>
                    </>
                  )}
                </span>
                <ActionButton
                  action={removePlayerAction}
                  fields={{ teamId: team.id, userId: p.id }}
                  label="Remove"
                  variant="danger"
                  confirm={`Remove ${p.username} from ${team.name}?`}
                />
              </li>
            ))}
          </ul>
        )}
        {open && (
          <div className="mt-4 border-t border-border pt-4">
            {full ? (
              <Empty>The roster is full. Raise the maximum size to add more players.</Empty>
            ) : eligible.length === 0 ? (
              <Empty>Everyone in the {team.game.name} community is already on this team.</Empty>
            ) : (
              <ServerForm
                action={addPlayerAction}
                hidden={{ teamId: team.id }}
                submitLabel="Add player"
                fields={[
                  {
                    label: "Add a community member",
                    name: "userId",
                    options: eligible.map((u) => ({ value: u.id, label: `${u.username} (${u.fullName})` })),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Section>

      <Section title="Team details">
        <ServerForm
          action={updateTeamAction}
          hidden={{ teamId: team.id }}
          submitLabel="Save team"
          layout="grid"
          fields={[
            { label: "Team name", name: "name", defaultValue: team.name },
            { label: "Season", name: "season", required: false, defaultValue: team.season ?? "" },
            {
              label: "Max roster size",
              name: "maxRosterSize",
              type: "number",
              required: false,
              defaultValue: team.maxRosterSize?.toString() ?? "",
              hint: "Leave blank for no limit",
            },
          ]}
        />
      </Section>
    </div>
  );
}
