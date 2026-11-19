import Link from "next/link";

export function TeamTabs({ teamId, active }: { teamId: string; active: "roster" | "schedule" | "vods" | "stats" }) {
  const tabs = [
    { key: "roster", label: "Roster", href: `/teams/${teamId}` },
    { key: "schedule", label: "Schedule", href: `/teams/${teamId}/schedule` },
    { key: "vods", label: "VODs", href: `/teams/${teamId}/vods` },
    { key: "stats", label: "Stats", href: `/teams/${teamId}/stats` },
  ];
  return (
    <nav aria-label="Team sections" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${t.key === active ? "border-accent font-medium" : "border-transparent text-muted"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
