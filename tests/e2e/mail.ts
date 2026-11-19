import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const OUTBOX = path.resolve(".mail-outbox/e2e");

/** Waits for the newest email to `to` containing `/path?token=` and returns the link. */
export async function latestLink(to: string, linkPath: "verify-email" | "reset-password", timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(OUTBOX).catch(() => [])).sort().reverse();
    for (const file of files) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, file), "utf8")) as { to: string; text: string };
      const match = mail.to === to && mail.text.match(new RegExp(`https?://\\S+/${linkPath}\\?token=\\S+`));
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No ${linkPath} email for ${to}`);
}
