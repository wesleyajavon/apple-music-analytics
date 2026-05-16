-- Composite index for user-scoped aggregates grouped by track (e.g. artist deep dive top tracks).
CREATE INDEX "Listen_userId_trackId_idx" ON "Listen"("userId", "trackId");
