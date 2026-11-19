import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Prisma.InputJsonValue;
};

export async function recordAudit(entry: AuditEntry, tx: Prisma.TransactionClient = db): Promise<void> {
  await tx.auditLog.create({ data: { ...entry, details: entry.details ?? {} } });
}
