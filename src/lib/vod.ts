// Recognize common video hosts so VODs can be embedded (AD9: links, not uploads).
export type VodEmbed = { provider: "youtube" | "twitch" | "other"; embedUrl: string | null };

export function vodEmbed(url: string, parentHost: string): VodEmbed {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { provider: "other", embedUrl: null };
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1);
  else if (host === "youtube.com") yt = u.searchParams.get("v") ?? (u.pathname.match(/^\/(?:embed|live|shorts)\/([\w-]+)/)?.[1] ?? null);
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    const t = Number(u.searchParams.get("t")?.replace(/s$/, ""));
    return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt}${t ? `?start=${t}` : ""}` };
  }
  if (host === "twitch.tv") {
    const vid = u.pathname.match(/^\/videos\/(\d+)/)?.[1];
    if (vid) return { provider: "twitch", embedUrl: `https://player.twitch.tv/?video=${vid}&parent=${parentHost}&autoplay=false` };
  }
  return { provider: "other", embedUrl: null };
}
