import { renderFeed } from "@/server/services/feed-service";

// FREQ40: private iCal feed, e.g. /api/calendar/<token>.ics — subscribe from Google/Outlook/Apple Calendar.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, "");
  const body = /^[A-Za-z0-9_-]{43}$/.test(token) ? await renderFeed(token) : null;
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="esports-hub.ics"',
    },
  });
}
