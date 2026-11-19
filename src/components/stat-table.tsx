import type { StatDefinition } from "@prisma/client";
import { fmtStat } from "@/lib/format";

type Row = { key: string; label: React.ReactNode; values: Record<string, number | null | undefined>; extra?: React.ReactNode };

/** Accessible stats table; columns are a level's stat definitions. */
export function StatTable({ defs, rows, firstColumn, extraColumn }: { defs: StatDefinition[]; rows: Row[]; firstColumn: string; extraColumn?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="text-muted">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              {firstColumn}
            </th>
            {extraColumn && (
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {extraColumn}
              </th>
            )}
            {defs.map((d) => (
              <th key={d.key} scope="col" className="py-2 pr-4 text-right font-medium" title={d.formula ?? undefined}>
                {d.label}
                {d.kind === "DERIVED" && <span aria-label="calculated"> ƒ</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="py-2 pr-4 font-medium">
                {r.label}
              </th>
              {extraColumn && <td className="py-2 pr-4 text-right">{r.extra}</td>}
              {defs.map((d) => (
                <td key={d.key} className="py-2 pr-4 text-right">
                  {fmtStat(r.values[d.key], d.precision)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
