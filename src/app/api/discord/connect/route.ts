import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { generateToken } from "@/server/auth/tokens";
import { getConfig } from "@/server/config";
import { discordAuthorizeUrl } from "@/server/services/discord-service";

const STATE_COOKIE = "discord_oauth_state";

// Starts Discord OAuth (UC-11 step 2). A random state cookie guards against CSRF.
export async function GET() {
  const { appUrl, isProduction, discord } = getConfig();
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);
  if (!discord) return NextResponse.redirect(`${appUrl}/profile?discord=disabled`);
  const state = generateToken();
  (await cookies()).set(STATE_COOKIE, `${user.id}.${state}`, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/discord",
    maxAge: 600,
  });
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
