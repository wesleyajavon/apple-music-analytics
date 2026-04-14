-- CreateEnum
CREATE TYPE "PaletteDecisionStatus" AS ENUM ('mapped', 'skipped');

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "genre" TEXT;

-- CreateTable
CREATE TABLE "PaletteArtistDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "status" "PaletteDecisionStatus" NOT NULL,
    "genre" TEXT,
    "unknownListensRemoved" INTEGER NOT NULL DEFAULT 0,
    "impactedTracks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaletteArtistDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayYearly" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalPlayTime" INTEGER NOT NULL,
    "totalPlays" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplayYearly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayTopArtist" (
    "id" TEXT NOT NULL,
    "replayYearlyId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "playCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayTopArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayTopTrack" (
    "id" TEXT NOT NULL,
    "replayYearlyId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "playCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayTopTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayTopAlbum" (
    "id" TEXT NOT NULL,
    "replayYearlyId" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "playCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplayTopAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaletteArtistDecision_userId_status_idx" ON "PaletteArtistDecision"("userId", "status");

-- CreateIndex
CREATE INDEX "PaletteArtistDecision_artistId_idx" ON "PaletteArtistDecision"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "PaletteArtistDecision_userId_artistId_key" ON "PaletteArtistDecision"("userId", "artistId");

-- CreateIndex
CREATE INDEX "ReplayYearly_userId_idx" ON "ReplayYearly"("userId");

-- CreateIndex
CREATE INDEX "ReplayYearly_year_idx" ON "ReplayYearly"("year");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayYearly_userId_year_key" ON "ReplayYearly"("userId", "year");

-- CreateIndex
CREATE INDEX "ReplayTopArtist_replayYearlyId_idx" ON "ReplayTopArtist"("replayYearlyId");

-- CreateIndex
CREATE INDEX "ReplayTopArtist_artistId_idx" ON "ReplayTopArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayTopArtist_replayYearlyId_rank_key" ON "ReplayTopArtist"("replayYearlyId", "rank");

-- CreateIndex
CREATE INDEX "ReplayTopTrack_replayYearlyId_idx" ON "ReplayTopTrack"("replayYearlyId");

-- CreateIndex
CREATE INDEX "ReplayTopTrack_trackId_idx" ON "ReplayTopTrack"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayTopTrack_replayYearlyId_rank_key" ON "ReplayTopTrack"("replayYearlyId", "rank");

-- CreateIndex
CREATE INDEX "ReplayTopAlbum_replayYearlyId_idx" ON "ReplayTopAlbum"("replayYearlyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplayTopAlbum_replayYearlyId_rank_key" ON "ReplayTopAlbum"("replayYearlyId", "rank");

-- CreateIndex
CREATE INDEX "Track_genre_idx" ON "Track"("genre");

-- AddForeignKey
ALTER TABLE "PaletteArtistDecision" ADD CONSTRAINT "PaletteArtistDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteArtistDecision" ADD CONSTRAINT "PaletteArtistDecision_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayYearly" ADD CONSTRAINT "ReplayYearly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayTopArtist" ADD CONSTRAINT "ReplayTopArtist_replayYearlyId_fkey" FOREIGN KEY ("replayYearlyId") REFERENCES "ReplayYearly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayTopArtist" ADD CONSTRAINT "ReplayTopArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayTopTrack" ADD CONSTRAINT "ReplayTopTrack_replayYearlyId_fkey" FOREIGN KEY ("replayYearlyId") REFERENCES "ReplayYearly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayTopTrack" ADD CONSTRAINT "ReplayTopTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayTopAlbum" ADD CONSTRAINT "ReplayTopAlbum_replayYearlyId_fkey" FOREIGN KEY ("replayYearlyId") REFERENCES "ReplayYearly"("id") ON DELETE CASCADE ON UPDATE CASCADE;
