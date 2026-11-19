import { afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { memoryOutbox } from "@/server/mail/mailer";

if (!process.env.DATABASE_URL?.includes("test")) {
  throw new Error("Integration tests must run against a test database (DATABASE_URL should contain 'test').");
}

let tables: string | undefined;

beforeEach(async () => {
  memoryOutbox.length = 0;
  if (!tables) {
    const rows = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  }
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await db.$disconnect();
});
