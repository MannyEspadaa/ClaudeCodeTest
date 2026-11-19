// FREQ42 / FREQ66: link a Discord identity so the username shows in the app.
import { db } from "@/server/db";
import { getConfig } from "@/server/config";
import { ServiceError } from "@/server/errors";

const DISCORD = "https://discord.com";

export function discordRedirectUri() {
  return `${getConfig().appUrl}/api/discord/callback`;
}

export function discordAuthorizeUrl(state: string): string {
  const cfg = getConfig().discord;
  if (!cfg) throw new ServiceError("DISCORD_DISABLED", "Discord linking isn't configured.");
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: discordRedirectUri(),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `${DISCORD}/oauth2/authorize?${p}`;
}

export type DiscordIdentity = { id: string; username: string };

/** Exchanges the OAuth code and returns the user's identity. The access token is not kept. */
export async function fetchDiscordIdentity(code: string, fetchImpl: typeof fetch = fetch): Promise<DiscordIdentity> {
  const cfg = getConfig().discord;
  if (!cfg) throw new ServiceError("DISCORD_DISABLED", "Discord linking isn't configured.");
  const tokenRes = await fetchImpl(`${DISCORD}/api/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: discordRedirectUri(),
    }),
  });
  if (!tokenRes.ok) throw new ServiceError("DISCORD_AUTH", "Discord rejected the authorization.");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new ServiceError("DISCORD_AUTH", "Discord rejected the authorization.");
  const meRes = await fetchImpl(`${DISCORD}/api/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) throw new ServiceError("DISCORD_AUTH", "Couldn't read your Discord profile.");
  const me = (await meRes.json()) as { id?: string; username?: string; global_name?: string | null };
  if (!me.id || !me.username) throw new ServiceError("DISCORD_AUTH", "Couldn't read your Discord profile.");
  return { id: me.id, username: me.username };
}

export async function linkDiscord(userId: string, identity: DiscordIdentity) {
  const taken = await db.discordLink.findUnique({ where: { discordId: identity.id } });
  if (taken && taken.userId !== userId) {
    throw new ServiceError("DISCORD_TAKEN", "That Discord account is already linked to another user.");
  }
  await db.discordLink.upsert({
    where: { userId },
    create: { userId, discordId: identity.id, discordUsername: identity.username },
    update: { discordId: identity.id, discordUsername: identity.username, linkedAt: new Date() },
  });
}

export async function unlinkDiscord(userId: string) {
  await db.discordLink.deleteMany({ where: { userId } });
}

export async function getDiscordUsername(userId: string): Promise<string | null> {
  return (await db.discordLink.findUnique({ where: { userId } }))?.discordUsername ?? null;
}
