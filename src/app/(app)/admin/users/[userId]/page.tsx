import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { getUserRoles } from "@/server/services/role-service";
import { setAdminAction, setGameManagerAction } from "@/app/actions/admin";
import { guard } from "@/app/page-guard";
import { ActionButton } from "@/components/action-button";
import { Badge, Empty, NoAccess, PageHeader, Section, fmtDate } from "@/components/ui";

export const metadata: Metadata = { title: "User · Admin · Esports Hub" };

// UC-9 Manage User Roles.
export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { ctx } = await requireUser();
  const res = await guard(() => getUserRoles(ctx, userId));
  if (res.forbidden) return <NoAccess />;
  const { user, games, audit } = res.data;
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
