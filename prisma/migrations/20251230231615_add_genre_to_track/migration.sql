-- DropIndex
DROP INDEX "Listen_source_playedAt_idx";

-- DropIndex
DROP INDEX "Listen_trackId_playedAt_idx";

-- DropIndex
DROP INDEX "Listen_userId_trackId_playedAt_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- CreateIndex
CREATE INDEX "Listen_userId_idx" ON "Listen"("userId");

-- CreateIndex
CREATE INDEX "Listen_trackId_idx" ON "Listen"("trackId");
