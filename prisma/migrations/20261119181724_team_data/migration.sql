-- CreateEnum
CREATE TYPE "public"."StatLevel" AS ENUM ('PLAYER', 'TEAM');

-- CreateEnum
CREATE TYPE "public"."StatKind" AS ENUM ('INPUT', 'DERIVED');

-- CreateEnum
CREATE TYPE "public"."CommentTarget" AS ENUM ('VOD', 'STAT_SHEET');

-- CreateTable
CREATE TABLE "public"."Vod" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "scheduleEntryId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatDefinition" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "level" "public"."StatLevel" NOT NULL,
    "kind" "public"."StatKind" NOT NULL,
    "formula" TEXT,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StatSheet" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "scheduleEntryId" TEXT,
    "title" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "teamValues" JSONB NOT NULL DEFAULT '{}',
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerStatLine" (
    "sheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "values" JSONB NOT NULL,

    CONSTRAINT "PlayerStatLine_pkey" PRIMARY KEY ("sheetId","userId")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "targetType" "public"."CommentTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vod_teamId_createdAt_idx" ON "public"."Vod"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatDefinition_gameId_key_key" ON "public"."StatDefinition"("gameId", "key");

-- CreateIndex
CREATE INDEX "StatSheet_teamId_playedAt_idx" ON "public"."StatSheet"("teamId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayerStatLine_userId_idx" ON "public"."PlayerStatLine"("userId");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_createdAt_idx" ON "public"."Comment"("targetType", "targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Vod" ADD CONSTRAINT "Vod_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vod" ADD CONSTRAINT "Vod_scheduleEntryId_fkey" FOREIGN KEY ("scheduleEntryId") REFERENCES "public"."ScheduleEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vod" ADD CONSTRAINT "Vod_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatDefinition" ADD CONSTRAINT "StatDefinition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatSheet" ADD CONSTRAINT "StatSheet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatSheet" ADD CONSTRAINT "StatSheet_scheduleEntryId_fkey" FOREIGN KEY ("scheduleEntryId") REFERENCES "public"."ScheduleEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatSheet" ADD CONSTRAINT "StatSheet_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStatLine" ADD CONSTRAINT "PlayerStatLine_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "public"."StatSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStatLine" ADD CONSTRAINT "PlayerStatLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
