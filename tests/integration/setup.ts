import { afterAll, beforeEach } from "vitest";
import { db } from "@/server/db";
import { memoryOutbox } from "@/server/mail/mailer";

if (!process.env.DATABASE_URL?.includes("test")) {
  throw new Error("Integration tests must run against a test database (DATABASE_URL should contain 'test').");
}

beforeEach(async () => {
  memoryOutbox.length = 0;
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "AuditLog", "EmailToken", "Session", "User" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await db.$disconnect();
});
