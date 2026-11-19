// All user-facing times are in the program's time zone (APP_TIMEZONE), regardless of server zone.

export const DEFAULT_TIMEZONE = "America/New_York";

export function appTimeZone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

/** Offset (ms) of `timeZone` from UTC at instant `date`. */
function offsetMs(date: Date, timeZone: string): number {
  const p = parts(date, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-11-20T18:30" (wall-clock in timeZone) → UTC Date. Returns null for malformed input. */
export function parseLocalDateTime(value: string, timeZone = appTimeZone()): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes handle DST transitions.
  let utc = wall - offsetMs(new Date(wall), timeZone);
  utc = wall - offsetMs(new Date(utc), timeZone);
  const check = parts(new Date(utc), timeZone);
  if (check.d !== d || check.m !== mo) return null; // e.g. Feb 31
  return new Date(utc);
}

/** UTC Date → "YYYY-MM-DDTHH:mm" in timeZone (for datetime-local inputs). */
export function toLocalInput(date: Date, timeZone = appTimeZone()): string {
  const p = parts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** "YYYY-MM-DD" key of the local calendar day. */
export function localDayKey(date: Date, timeZone = appTimeZone()): string {
  return toLocalInput(date, timeZone).slice(0, 10);
}

/** UTC instant of local midnight starting day `key` ("YYYY-MM-DD"). */
export function startOfLocalDay(key: string, timeZone = appTimeZone()): Date {
  return parseLocalDateTime(`${key}T00:00`, timeZone)!;
}

export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatDateTime(date: Date, timeZone = appTimeZone()): string {
  return date.toLocaleString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(date: Date, timeZone = appTimeZone()): string {
  return date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
}

export function formatDayHeading(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

/** Time-zone abbreviation for display, e.g. "EST". */
export function zoneLabel(date = new Date(), timeZone = appTimeZone()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}
