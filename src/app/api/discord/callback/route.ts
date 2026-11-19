import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { getConfig } from "@/server/config";
import { ServiceError } from "@/server/errors";
import { fetchDiscordIdentity, linkDiscord } from "@/server/services/discord-service";

const STATE_COOKIE = "discord_oauth_state";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// UC-11 steps 4-6 and the "Discord authentication failure" extension.
export async function GET(req: NextRequest) {
  const { appUrl } = getConfig();
  const done = (status: string) => NextResponse.redirect(`${appUrl}/profile?discord=${status}`);
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value ?? "";
  jar.delete({ name: STATE_COOKIE, path: "/api/discord" });

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (req.nextUrl.searchParams.get("error") || !code) return done("cancelled");
  if (!saved || !same(saved, `${user.id}.${state}`)) return done("error");

  try {
    await linkDiscord(user.id, await fetchDiscordIdentity(code));
  } catch (err) {
    if (err instanceof ServiceError && err.code === "DISCORD_TAKEN") return done("taken");
    console.error(err);
    return done("error");
  }
  return done("linked");
}
