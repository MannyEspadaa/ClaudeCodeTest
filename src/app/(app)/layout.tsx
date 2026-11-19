import { requireUser } from "@/server/auth/current-user";

// Every page in this group requires a signed-in, active user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
