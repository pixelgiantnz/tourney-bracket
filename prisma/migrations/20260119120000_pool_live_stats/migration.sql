-- CreateEnum
CREATE TYPE "TournamentGameType" AS ENUM ('DEFAULT', 'POOL');

-- CreateEnum
CREATE TYPE "PoolStatKind" AS ENUM ('MADE', 'MISSED', 'FOUL');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "gameType" "TournamentGameType" NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "Tournament" ADD COLUMN "poolRaceTo" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "isLive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN "poolRaceToOverride" INTEGER;
ALTER TABLE "Match" ADD COLUMN "proposedWinnerTeamId" TEXT;

-- CreateTable
CREATE TABLE "PoolStatEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kind" "PoolStatKind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolStatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoolStatEvent_matchId_sequence_key" ON "PoolStatEvent"("matchId", "sequence");

-- CreateIndex
CREATE INDEX "PoolStatEvent_matchId_idx" ON "PoolStatEvent"("matchId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_proposedWinnerTeamId_fkey" FOREIGN KEY ("proposedWinnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolStatEvent" ADD CONSTRAINT "PoolStatEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolStatEvent" ADD CONSTRAINT "PoolStatEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
