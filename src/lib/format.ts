export function fmtStat(v: number | null | undefined, precision = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: precision, maximumFractionDigits: precision });
}
