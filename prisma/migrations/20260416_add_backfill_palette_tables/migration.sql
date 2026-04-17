-- CreateEnum
CREATE TYPE "ImportGenreBackfillJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PaletteSuggestionMode" AS ENUM ('artists', 'tracks');

-- CreateEnum
CREATE TYPE "PaletteSuggestionDecisionType" AS ENUM ('accepted', 'edited', 'rejected');

-- CreateTable
CREATE TABLE "ImportGenreBackfillJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'spotify',
    "status" "ImportGenreBackfillJobStatus" NOT NULL DEFAULT 'pending',
    "targetUnknownPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "delayMs" INTEGER NOT NULL DEFAULT 300,
    "maxApiRequests" INTEGER NOT NULL DEFAULT 250,
    "maxArtists" INTEGER NOT NULL DEFAULT 200,
    "apiRequestsUsed" INTEGER NOT NULL DEFAULT 0,
    "artistsProcessed" INTEGER NOT NULL DEFAULT 0,
    "artistsMapped" INTEGER NOT NULL DEFAULT 0,
    "tracksUpdated" INTEGER NOT NULL DEFAULT 0,
    "initialUnknownPct" DOUBLE PRECISION,
    "currentUnknownPct" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportGenreBackfillJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "PaletteSuggestionMode" NOT NULL,
    "artistId" TEXT,
    "trackId" TEXT,
    "provider" TEXT NOT NULL,
    "suggestedGenreRaw" TEXT NOT NULL,
    "suggestedGenreNormalized" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaletteSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteSuggestionDecision" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" "PaletteSuggestionDecisionType" NOT NULL,
    "finalGenre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaletteSuggestionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportGenreBackfillJob_userId_createdAt_idx" ON "ImportGenreBackfillJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportGenreBackfillJob_status_createdAt_idx" ON "ImportGenreBackfillJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaletteSuggestion_userId_mode_createdAt_idx" ON "PaletteSuggestion"("userId", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "PaletteSuggestion_artistId_createdAt_idx" ON "PaletteSuggestion"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "PaletteSuggestion_trackId_createdAt_idx" ON "PaletteSuggestion"("trackId", "createdAt");

-- CreateIndex
CREATE INDEX "PaletteSuggestionDecision_userId_createdAt_idx" ON "PaletteSuggestionDecision"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaletteSuggestionDecision_suggestionId_createdAt_idx" ON "PaletteSuggestionDecision"("suggestionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImportGenreBackfillJob" ADD CONSTRAINT "ImportGenreBackfillJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteSuggestion" ADD CONSTRAINT "PaletteSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteSuggestion" ADD CONSTRAINT "PaletteSuggestion_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteSuggestion" ADD CONSTRAINT "PaletteSuggestion_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteSuggestionDecision" ADD CONSTRAINT "PaletteSuggestionDecision_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "PaletteSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteSuggestionDecision" ADD CONSTRAINT "PaletteSuggestionDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

