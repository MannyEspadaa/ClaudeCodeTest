// FREQ10: role-aware dashboard data.
import { db } from "@/server/db";
import type { AuthzContext } from "@/server/authz/policy";
import { listCalendarItems } from "./calendar-service";
import { listAnnouncements } from "./announcement-service";
import { getMemberships } from "./community-service";

export async function getDashboard(actor: AuthzContext) {
  const now = new Date();
  const managedGameIds = actor.isAdmin ? undefined : [...actor.managedGameIds];
  const isManager = actor.isAdmin || actor.managedGameIds.size > 0;

  const [upcoming, announcements, memberships, pendingRequests, myPending, adminStats] = await Promise.all([
    listCalendarItems(actor, { from: now, to: new Date(now.getTime() + 14 * 86_400_000), mine: true, limit: 8 }),
    listAnnouncements(actor, { limit: 5 }),
    getMemberships(actor.userId),
    isManager
      ? db.rosterRequest.count({ where: { status: "PENDING", team: managedGameIds ? { gameId: { in: managedGameIds } } : {} } })
      : Promise.resolve(0),
    db.rosterRequest.count({ where: { userId: actor.userId, status: "PENDING" } }),
    actor.isAdmin
      ? Promise.all([
          db.user.count({ where: { status: "ACTIVE" } }),
          db.user.count({ where: { status: "SUSPENDED" } }),
          db.game.count({ where: { status: "ACTIVE" } }),
          db.team.count({ where: { status: { not: "ARCHIVED" } } }),
        ]).then(([users, suspended, games, teams]) => ({ users, suspended, games, teams }))
      : Promise.resolve(null),
  ]);
  return { upcoming, announcements, memberships, pendingRequests, myPending, isManager, adminStats };
}
