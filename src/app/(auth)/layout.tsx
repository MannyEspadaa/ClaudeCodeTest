import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";

// Signed-in users have no reason to see the login/register screens.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return <>{children}</>;
}
