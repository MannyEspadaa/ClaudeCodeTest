import { memoryOutbox } from "@/server/mail/mailer";
import * as accounts from "@/server/services/account-service";

export const PASSWORD = "correct-horse-battery";

export function tokenFromLastMail(path: "verify-email" | "reset-password"): string {
  const mail = memoryOutbox.at(-1);
  const match = mail?.text.match(new RegExp(`/${path}\\?token=([^\\s]+)`));
  if (!match) throw new Error(`No ${path} link in last email`);
  return decodeURIComponent(match[1]);
}

export async function registerVerified(overrides: Partial<{ email: string; username: string; fullName: string }> = {}) {
  const input = {
    email: "alex@example.edu",
    fullName: "Alex Kim",
    username: "alex_k",
    password: PASSWORD,
    ...overrides,
  };
  const user = await accounts.register(input);
  await accounts.verifyEmail(tokenFromLastMail("verify-email"));
  return { ...input, id: user.id };
}
