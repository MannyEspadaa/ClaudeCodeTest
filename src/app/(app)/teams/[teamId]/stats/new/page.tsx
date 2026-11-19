import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { SheetFormPage } from "@/app/sheet-form-page";

export const metadata: Metadata = { title: "Enter stats · Esports Hub" };

export default async function NewSheetPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { ctx } = await requireUser();
  return <SheetFormPage ctx={ctx} teamId={teamId} />;
}
