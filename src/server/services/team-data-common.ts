import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { requireTeam, teamResource } from "./team-service";

/** Loads a team and checks a team-data permission (UC-8 / UC-13 "unauthorized team access"). */
export async function teamWith(actor: AuthzContext, teamId: string, action: "teamData.view" | "teamData.manage" | "teamData.reply") {
  const team = await requireTeam(teamId);
  authorize(actor, action, teamResource(team));
  return team;
}
