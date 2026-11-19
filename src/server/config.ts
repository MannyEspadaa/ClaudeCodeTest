import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ALLOWED_EMAIL_DOMAINS: z.string().default("example.edu"),
  MAIL_TRANSPORT: z.enum(["console", "file", "smtp", "memory"]).default("console"),
  MAIL_OUTBOX_DIR: z.string().default(".mail-outbox"),
  MAIL_FROM: z.string().default("Esports Hub <no-reply@example.edu>"),
  SMTP_URL: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppConfig = {
  databaseUrl: string;
  appUrl: string;
  allowedEmailDomains: string[];
  mailTransport: "console" | "file" | "smtp" | "memory";
  mailOutboxDir: string;
  mailFrom: string;
  smtpUrl?: string;
  discord: { clientId: string; clientSecret: string } | null;
  isProduction: boolean;
};

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const env = schema.parse(process.env);
  if (env.MAIL_TRANSPORT === "smtp" && !env.SMTP_URL) {
    throw new Error("SMTP_URL is required when MAIL_TRANSPORT=smtp");
  }
  cached = {
    databaseUrl: env.DATABASE_URL,
    appUrl: env.APP_URL.replace(/\/$/, ""),
    allowedEmailDomains: env.ALLOWED_EMAIL_DOMAINS.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    mailTransport: env.MAIL_TRANSPORT,
    mailOutboxDir: env.MAIL_OUTBOX_DIR,
    mailFrom: env.MAIL_FROM,
    smtpUrl: env.SMTP_URL || undefined,
    discord: env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET } : null,
    isProduction: env.NODE_ENV === "production",
  };
  return cached;
}
