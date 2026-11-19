import Link from "next/link";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

const BADGE = {
  neutral: "border-border text-muted",
  accent: "border-accent/40 text-accent",
  ok: "border-ok/40 text-ok",
  danger: "border-danger/40 text-danger",
} as const;

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof BADGE }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">No access</h1>
      <p className="text-muted">You don&apos;t have permission to view {what}.</p>
      <Link href="/dashboard" className="text-accent underline">
        Back to dashboard
      </Link>
    </div>
  );
}

export function TeamStatusBadge({ status }: { status: "SHELL" | "ACTIVE" | "ARCHIVED" }) {
  return status === "ACTIVE" ? <Badge tone="ok">Active</Badge> : status === "SHELL" ? <Badge>Shell</Badge> : <Badge tone="danger">Archived</Badge>;
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}
