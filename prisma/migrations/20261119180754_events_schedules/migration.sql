-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PUBLIC', 'MEMBERS', 'TEAM');

-- CreateEnum
CREATE TYPE "public"."ScheduleType" AS ENUM ('MATCH', 'SCRIM', 'PRACTICE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PUBLIC',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduleEntry" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT,
    "type" "public"."ScheduleType" NOT NULL,
    "title" TEXT NOT NULL,
    "opponent" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "visibility" "public"."Visibility" NOT NULL,
    "result" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "gameId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "public"."Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_gameId_startsAt_idx" ON "public"."Event"("gameId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEntry_startsAt_idx" ON "public"."ScheduleEntry"("startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEntry_teamId_startsAt_idx" ON "public"."ScheduleEntry"("teamId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEntry_gameId_startsAt_idx" ON "public"."ScheduleEntry"("gameId", "startsAt");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "public"."Announcement"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_time_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_time_order" CHECK ("endsAt" > "startsAt");
-- Team-only entries must name a team; events are never team-only.
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_team_visibility" CHECK ("visibility" <> 'TEAM' OR "teamId" IS NOT NULL);
ALTER TABLE "Event" ADD CONSTRAINT "Event_no_team_visibility" CHECK ("visibility" <> 'TEAM');
