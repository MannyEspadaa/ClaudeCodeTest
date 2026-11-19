import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getUserRoles } from "@/server/services/role-service";
import { getModerationInfo } from "@/server/services/moderation-service";
import { liftSuspensionAction, removeUserAction, suspendAction } from "@/app/actions/integrations";
import { ServerForm } from "@/components/server-form";
import { formatDateTime, zoneLabel } from "@/lib/time";
import { setAdminAction, setGameManagerAction } from "@/app/actions/admin";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { Badge, Empty, NoAccess, PageHeader, Section, fmtDate } from "@/components/ui";

export const metadata: Metadata = { title: "User · Admin · Esports Hub" };

// UC-9 Manage User Roles.
export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(async () => ({ ...(await getUserRoles(ctx, userId)), moderation: await getModerationInfo(ctx, userId) }));
  if (res.forbidden) return <NoAccess />;
  const { user, games, audit, moderation } = res.data;
  const isSelf = user.id === ctx.userId;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.username}
        subtitle={
          <>
            {user.fullName} · {user.email} · joined {fmtDate(user.createdAt)}{" "}
            {user.status !== "ACTIVE" && <Badge tone="danger">{user.status.toLowerCase()}</Badge>}
          </>
        }
        actions={
          <Link href={`/users/${user.username}`} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium">
            Public profile
          </Link>
        }
      />

      <Section title="Administrator">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {user.isAdmin ? "This user is an Administrator (full access to every game)." : "This user is not an Administrator."}
          </p>
          {user.isAdmin ? (
            isSelf ? (
              <span className="text-sm text-muted">You can&apos;t remove your own Admin role.</span>
            ) : (
              <ActionButton
                action={setAdminAction}
                fields={{ userId: user.id, grant: "false" }}
                label="Revoke Admin"
                variant="danger"
                confirm={`Remove Admin from ${user.username}?`}
              />
            )
          ) : (
            <ActionButton
              action={setAdminAction}
              fields={{ userId: user.id, grant: "true" }}
              label="Make Admin"
              confirm={`Give ${user.username} full Administrator access?`}
            />
          )}
        </div>
      </Section>

      <Section title="Game Manager">
        {games.length === 0 ? (
          <Empty>No games exist yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {games.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {g.name} {g.status === "ARCHIVED" && <Badge>archived</Badge>} {g.isManager && <Badge tone="accent">Manager</Badge>}
                </span>
                <ActionButton
                  action={setGameManagerAction}
                  fields={{ userId: user.id, gameId: g.id, grant: g.isManager ? "false" : "true" }}
                  label={g.isManager ? "Remove" : "Make manager"}
                  variant={g.isManager ? "danger" : "secondary"}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Moderation">
        {user.status === "REMOVED" ? (
          <p className="text-sm text-muted">This account was removed and its personal data erased.</p>
        ) : isSelf ? (
          <p className="text-sm text-muted">You can&apos;t moderate your own account.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {user.status === "SUSPENDED" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Suspended{moderation.current?.until ? ` until ${formatDateTime(moderation.current.until)}` : " indefinitely"}
                  {moderation.current && <> · “{moderation.current.reason}”</>}
                </p>
                <ActionButton action={liftSuspensionAction} fields={{ userId: user.id }} label="Lift suspension" variant="primary" />
              </div>
            ) : (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-accent">Suspend account</summary>
                <div className="mt-3 max-w-xl">
                  <ServerForm
                    action={suspendAction}
                    hidden={{ userId: user.id }}
                    submitLabel="Suspend"
                    layout="grid"
                    fields={[
                      { label: "Reason", name: "reason", rows: 2 },
                      { label: "Until (optional)", name: "until", type: "datetime-local", required: false, hint: `Leave blank for indefinite. ${zoneLabel()}.` },
                    ]}
                  />
                </div>
              </details>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-danger">Remove account</summary>
              <div className="mt-3 max-w-xl">
                <p className="mb-3 text-sm text-muted">
                  Erases name, email and username, removes memberships and integrations, and signs them out. VODs, stats and notes they created stay.
                  This can&apos;t be undone.
                </p>
                <ServerForm action={removeUserAction} hidden={{ userId: user.id }} submitLabel="Remove permanently" fields={[{ label: "Reason", name: "reason", rows: 2 }]} />
              </div>
            </details>
            {moderation.history.length > 0 && (
              <ul className="text-xs text-muted">
                {moderation.history.map((s) => (
                  <li key={s.id}>
                    {formatDateTime(s.createdAt)} suspended by {s.createdBy?.username ?? "system"}: “{s.reason}”
                    {s.liftedAt ? ` · lifted ${formatDateTime(s.liftedAt)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {moderation.discord && <p className="mt-4 text-sm text-muted">Discord: {moderation.discord.discordUsername}</p>}
      </Section>

      <Section title="Recent activity">
        {audit.length === 0 ? (
          <Empty>No role or moderation changes recorded.</Empty>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {audit.map((a) => (
              <li key={a.id}>
                <span className="text-muted">{a.createdAt.toLocaleString("en-US")}</span> · <code>{a.action}</code> by {a.actor}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
