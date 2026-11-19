-- CreateEnum
CREATE TYPE "public"."GameStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."TeamStatus" AS ENUM ('SHELL', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."RosterRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "public"."GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommunityMembership" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateTable
CREATE TABLE "public"."GameManagerAssignment" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameManagerAssignment_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."TeamStatus" NOT NULL DEFAULT 'SHELL',
    "maxRosterSize" INTEGER,
    "season" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMembership" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "public"."RosterRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."RosterRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "RosterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "public"."Game"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "public"."Game"("slug");

-- CreateIndex
CREATE INDEX "CommunityMembership_gameId_idx" ON "public"."CommunityMembership"("gameId");

-- CreateIndex
CREATE INDEX "GameManagerAssignment_gameId_idx" ON "public"."GameManagerAssignment"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_gameId_name_key" ON "public"."Team"("gameId", "name");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_idx" ON "public"."TeamMembership"("userId");

-- CreateIndex
CREATE INDEX "RosterRequest_teamId_status_idx" ON "public"."RosterRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "RosterRequest_userId_status_idx" ON "public"."RosterRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "public"."CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommunityMembership" ADD CONSTRAINT "CommunityMembership_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameManagerAssignment" ADD CONSTRAINT "GameManagerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameManagerAssignment" ADD CONSTRAINT "GameManagerAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameManagerAssignment" ADD CONSTRAINT "GameManagerAssignment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterRequest" ADD CONSTRAINT "RosterRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterRequest" ADD CONSTRAINT "RosterRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterRequest" ADD CONSTRAINT "RosterRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- At most one pending request per user per team.
CREATE UNIQUE INDEX "RosterRequest_one_pending" ON "RosterRequest"("teamId", "userId") WHERE "status" = 'PENDING';
-- Capacity, when set, must be positive.
ALTER TABLE "Team" ADD CONSTRAINT "Team_maxRosterSize_positive" CHECK ("maxRosterSize" IS NULL OR "maxRosterSize" > 0);
