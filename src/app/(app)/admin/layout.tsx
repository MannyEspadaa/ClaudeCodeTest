import Link from "next/link";
import { requireUser } from "@/server/auth/current-user";
import { NoAccess } from "@/components/ui";

const LINKS = [
  { href: "/admin/users", label: "Users & roles" },
  { href: "/admin/games", label: "Games" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ctx } = await requireUser();
  if (!ctx.isAdmin) return <NoAccess what="the admin area" />;
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Admin" className="flex flex-wrap gap-2 text-sm">
        <span className="font-semibold">Admin:</span>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-accent underline">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
