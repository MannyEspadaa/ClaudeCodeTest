import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { listUsers } from "@/server/services/role-service";
import { Badge, Empty, NoAccess, PageHeader } from "@/components/ui";
import { guard } from "@/app/page-guard";

export const metadata: Metadata = { title: "Users · Admin · Esports Hub" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page } = await searchParams;
  const { ctx } = await requireUser();
  const loaded = await guard(() => listUsers(ctx, { q, page: Number(page) || 1 }));
  if (loaded.forbidden) return <NoAccess what="the admin area" />;
  const res = loaded.data;
  const pageLink = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Users & roles" subtitle={`${res.total} account${res.total === 1 ? "" : "s"}`} />
      <form className="mb-6 flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search users
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Search name, username or email"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2"
        />
        <button className="rounded-md border border-border px-4 py-2 text-sm font-medium">Search</button>
      </form>
      {res.users.length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Roles</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {res.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-accent underline">
                      {u.username}
                    </Link>
                    <div className="text-muted">{u.fullName}</div>
                  </td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.isAdmin && <Badge tone="accent">Admin</Badge>}
                      {u.managedGames.map((g) => (
                        <Badge key={g}>GM · {g}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {u.status === "ACTIVE" ? (u.emailVerifiedAt ? "Active" : "Unverified") : <Badge tone="danger">{u.status.toLowerCase()}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {res.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex gap-3 text-sm">
          {res.page > 1 && <Link href={pageLink(res.page - 1)}>← Previous</Link>}
          <span className="text-muted">
            Page {res.page} of {res.pageCount}
          </span>
          {res.page < res.pageCount && <Link href={pageLink(res.page + 1)}>Next →</Link>}
        </nav>
      )}
    </>
  );
}
