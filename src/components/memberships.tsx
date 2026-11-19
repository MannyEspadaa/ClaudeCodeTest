import Link from "next/link";
import { Badge, Empty } from "./ui";

type Memberships = {
  communities: { id: string; name: string; slug: string; status: string }[];
  teams: { id: string; name: string; status: string; game: { id: string; name: string; slug: string } }[];
};

/** FREQ7/FREQ9: communities and teams a user belongs to. Team links only when the viewer may open them. */
export function MembershipList({ data, linkTeams }: { data: Memberships; linkTeams: (team: { id: string; game: { id: string } }) => boolean }) {
  if (data.communities.length === 0) return <Empty>Not in any game communities yet.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {data.communities.map((c) => {
        const teams = data.teams.filter((t) => t.game.slug === c.slug);
        return (
          <li key={c.id}>
            <Link href={`/games/${c.slug}`} className="font-medium hover:underline">
              {c.name}
            </Link>{" "}
            {c.status === "ARCHIVED" && <Badge>archived</Badge>}
            {teams.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-2">
                {teams.map((t) => (
                  <li key={t.id}>
                    {linkTeams(t) ? (
                      <Link href={`/teams/${t.id}`}>
                        <Badge tone="ok">{t.name}</Badge>
                      </Link>
                    ) : (
                      <Badge tone="ok">{t.name}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Community member</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
