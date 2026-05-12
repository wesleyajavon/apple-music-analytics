-- CreateTable
CREATE TABLE "PaletteTrackDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "status" "PaletteDecisionStatus" NOT NULL,
    "genre" TEXT,
    "unknownListensRemoved" INTEGER NOT NULL DEFAULT 0,
    "impactedTracks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaletteTrackDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaletteTrackDecision_userId_trackId_key" ON "PaletteTrackDecision"("userId", "trackId");

-- CreateIndex
CREATE INDEX "PaletteTrackDecision_userId_status_idx" ON "PaletteTrackDecision"("userId", "status");

-- CreateIndex
CREATE INDEX "PaletteTrackDecision_trackId_idx" ON "PaletteTrackDecision"("trackId");

-- AddForeignKey
ALTER TABLE "PaletteTrackDecision" ADD CONSTRAINT "PaletteTrackDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteTrackDecision" ADD CONSTRAINT "PaletteTrackDecision_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
