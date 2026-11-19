import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { getConfig } from "@/server/config";

export type MailMessage = { to: string; subject: string; text: string };

/** In-memory outbox used by tests (MAIL_TRANSPORT=memory). */
export const memoryOutbox: MailMessage[] = [];

let smtp: nodemailer.Transporter | undefined;

export async function sendMail(message: MailMessage): Promise<void> {
  const config = getConfig();
  switch (config.mailTransport) {
    case "memory":
      memoryOutbox.push(message);
      return;
    case "console":
      console.info(`[mail] to=${message.to} subject="${message.subject}"\n${message.text}`);
      return;
    case "file": {
      await mkdir(config.mailOutboxDir, { recursive: true });
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
      await writeFile(path.join(config.mailOutboxDir, name), JSON.stringify(message, null, 2));
      return;
    }
    case "smtp":
      smtp ??= nodemailer.createTransport(config.smtpUrl);
      await smtp.sendMail({ from: config.mailFrom, ...message });
      return;
  }
}
