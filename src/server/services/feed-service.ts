// FREQ40 / FREQ65: private iCal subscription feed per user.
import { db } from "@/server/db";
import { getConfig } from "@/server/config";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { loadAuthzContext } from "@/server/authz/context";
import { buildCalendar } from "@/lib/ics";
import { listCalendarItems } from "./calendar-service";

export function feedUrl(token: string) {
  return `${getConfig().appUrl}/api/calendar/${token}.ics`;
}

/** Creates or replaces the user's feed token. The raw token is returned once and never stored. */
export async function regenerateFeed(userId: string): Promise<string> {
  const token = generateToken();
  await db.calendarFeedToken.upsert({
    where: { userId },
    create: { userId, tokenHash: hashToken(token) },
    update: { tokenHash: hashToken(token), createdAt: new Date() },
  });
  return feedUrl(token);
}

export async function revokeFeed(userId: string) {
  await db.calendarFeedToken.deleteMany({ where: { userId } });
}

export async function getFeedStatus(userId: string) {
  return db.calendarFeedToken.findUnique({ where: { userId }, select: { createdAt: true } });
}

/** ICS text for a feed token, or null if the token is unknown or the user is inactive. */
export async function renderFeed(token: string): Promise<string | null> {
  const row = await db.calendarFeedToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, isAdmin: true, status: true } } },
  });
  if (!row || row.user.status !== "ACTIVE") return null;
  const ctx = await loadAuthzContext(row.user);
  const now = Date.now();
  // The feed follows the user's personal calendar (their games, teams and global events).
  const items = await listCalendarItems(ctx, { from: new Date(now - 30 * 86_400_000), to: new Date(now + 180 * 86_400_000), mine: true });
  const base = getConfig().appUrl;
  const host = new URL(base).hostname;
  return buildCalendar(
    "Esports Hub",
    items.map((i) => ({
      uid: `${i.kind}-${i.id}@${host}`,
      start: i.startsAt,
      end: i.endsAt,
      summary: i.game ? `${i.title} (${i.game.name})` : i.title,
      location: i.location,
      description: [i.team?.name, i.type?.toLowerCase()].filter(Boolean).join(" · ") || null,
      url: `${base}/schedule/${i.kind}/${i.id}`,
    })),
  );
}
