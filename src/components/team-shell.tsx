import Link from "next/link";
import { TeamTabs } from "./team-tabs";
import { PageHeader, TeamStatusBadge } from "./ui";

export function TeamShell({
  team,
  active,
  actions,
  children,
}: {
  team: { id: string; name: string; status: "SHELL" | "ACTIVE" | "ARCHIVED"; game: { name: string; slug: string } };
  active: "roster" | "schedule" | "vods" | "stats";
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={team.name}
        subtitle={
          <>
            <Link href={`/games/${team.game.slug}`} className="underline">
              {team.game.name}
            </Link>{" "}
            · <TeamStatusBadge status={team.status} />
          </>
        }
        actions={actions}
      />
      <TeamTabs teamId={team.id} active={active} />
      {children}
    </div>
  );
}
