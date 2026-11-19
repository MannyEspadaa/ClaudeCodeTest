import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { SheetFormPage } from "@/app/sheet-form-page";

export const metadata: Metadata = { title: "Edit stats · Esports Hub" };

export default async function EditSheetPage({ params }: { params: Promise<{ teamId: string; sheetId: string }> }) {
  const { teamId, sheetId } = await params;
  const { ctx } = await requireUser();
  return <SheetFormPage ctx={ctx} teamId={teamId} sheetId={sheetId} />;
}
