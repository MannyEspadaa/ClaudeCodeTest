// UC-6 Join or Leave Rosters, original UC #5 Promote (FREQ20, 22, 55, 56, 57).
import { Prisma, type Team } from "@prisma/client";
import { db } from "@/server/db";
import { recordAudit } from "@/server/audit";
import { authorize } from "@/server/authz/context";
import type { AuthzContext } from "@/server/authz/policy";
import { NotFoundError, ServiceError } from "@/server/errors";
import { assertGameActive } from "./game-service";
import { requireTeam, teamResource } from "./team-service";

type Tx = Prisma.TransactionClient;

const ROSTER_FULL = () => new ServiceError("ROSTER_FULL", "This roster is full.");

function assertTeamOpen(team: Team & { game: { status: string } }) {
  assertGameActive(team.game);
  if (team.status === "ARCHIVED") throw new ServiceError("TEAM_ARCHIVED", "This team is archived.");
}

/** Row lock so concurrent approvals can't overfill a roster. */
async function lockTeam(tx: Tx, teamId: string): Promise<Team> {
  await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;
  return tx.team.findUniqueOrThrow({ where: { id: teamId } });
}

async function addMemberLocked(tx: Tx, teamId: string, userId: string) {
  const team = await lockTeam(tx, teamId);
  const count = await tx.teamMembership.count({ where: { teamId } });
  if (team.maxRosterSize !== null && count >= team.maxRosterSize) throw ROSTER_FULL();
  const existing = await tx.teamMembership.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (existing) throw new ServiceError("ALREADY_ON_TEAM", "That player is already on this team.");
  await tx.teamMembership.create({ data: { teamId, userId } });
  if (team.status === "SHELL") await tx.team.update({ where: { id: teamId }, data: { status: "ACTIVE" } });
}

async function assertEligible(tx: Tx, gameId: string, userId: string) {
  const member = await tx.communityMembership.findUnique({
    where: { userId_gameId: { userId, gameId } },
    include: { user: { select: { status: true } } },
  });
  if (!member || member.user.status !== "ACTIVE") {
    throw new ServiceError("NOT_COMMUNITY_MEMBER", "Only active members of this game's community can be on its teams.");
  }
}

export async function requestToJoin(actor: AuthzContext, teamId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "team.requestJoin", teamResource(team));
  assertTeamOpen(team);
  if (actor.teamIds.has(teamId)) throw new ServiceError("ALREADY_ON_TEAM", "You're already on this team.");
  const count = await db.teamMembership.count({ where: { teamId } });
  if (team.maxRosterSize !== null && count >= team.maxRosterSize) throw ROSTER_FULL();
  try {
    return await db.rosterRequest.create({ data: { teamId, userId: actor.userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ServiceError("ALREADY_REQUESTED", "You already have a pending request for this team.");
    }
    throw err;
  }
}

export async function cancelRequest(actor: AuthzContext, requestId: string) {
  const res = await db.rosterRequest.updateMany({
    where: { id: requestId, userId: actor.userId, status: "PENDING" },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  if (res.count === 0) throw new NotFoundError("Request not found.");
}

export async function decideRequest(actor: AuthzContext, requestId: string, approve: boolean) {
  const request = await db.rosterRequest.findUnique({ where: { id: requestId }, include: { team: { include: { game: true } } } });
  if (!request) throw new NotFoundError("Request not found.");
  authorize(actor, "roster.manage", teamResource(request.team));
  if (request.status !== "PENDING") throw new ServiceError("ALREADY_DECIDED", "This request was already handled.");

  await db.$transaction(async (tx) => {
    if (approve) {
      assertTeamOpen(request.team);
      await assertEligible(tx, request.team.gameId, request.userId);
      await addMemberLocked(tx, request.teamId, request.userId);
    }
    const updated = await tx.rosterRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: approve ? "APPROVED" : "DENIED", decidedAt: new Date(), decidedById: actor.userId },
    });
    if (updated.count === 0) throw new ServiceError("ALREADY_DECIDED", "This request was already handled.");
    await recordAudit(
      { actorId: actor.userId, action: approve ? "roster.approve" : "roster.deny", targetType: "team", targetId: request.teamId, details: { userId: request.userId } },
      tx,
    );
  });
}

/** Promote a Community Member to Player directly (original UC #5). */
export async function addPlayer(actor: AuthzContext, teamId: string, userId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "roster.manage", teamResource(team));
  assertTeamOpen(team);
  await db.$transaction(async (tx) => {
    await assertEligible(tx, team.gameId, userId);
    await addMemberLocked(tx, teamId, userId);
    await tx.rosterRequest.updateMany({
      where: { teamId, userId, status: "PENDING" },
      data: { status: "APPROVED", decidedAt: new Date(), decidedById: actor.userId },
    });
    await recordAudit({ actorId: actor.userId, action: "roster.add", targetType: "team", targetId: teamId, details: { userId } }, tx);
  });
}

export async function removePlayer(actor: AuthzContext, teamId: string, userId: string) {
  const team = await requireTeam(teamId);
  authorize(actor, "roster.manage", teamResource(team));
  const res = await db.teamMembership.deleteMany({ where: { teamId, userId } });
  if (res.count === 0) throw new NotFoundError("That player is not on this team.");
  await recordAudit({ actorId: actor.userId, action: "roster.remove", targetType: "team", targetId: teamId, details: { userId } });
}

/** FREQ22: leaving is immediate and needs no approval. */
export async function leaveTeam(actor: AuthzContext, teamId: string) {
  const res = await db.teamMembership.deleteMany({ where: { teamId, userId: actor.userId } });
  if (res.count === 0) throw new NotFoundError("You're not on this team.");
  await recordAudit({ actorId: actor.userId, action: "roster.leave", targetType: "team", targetId: teamId, details: { userId: actor.userId } });
}
