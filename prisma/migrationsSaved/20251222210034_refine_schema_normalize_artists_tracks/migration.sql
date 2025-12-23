-- AlterTable: Add nameLower column to Artist
ALTER TABLE "Artist" ADD COLUMN IF NOT EXISTS "nameLower" TEXT;

-- Populate nameLower with lowercase version of name
UPDATE "Artist" SET "nameLower" = LOWER("name") WHERE "nameLower" IS NULL;

-- Make nameLower NOT NULL and add unique constraint
ALTER TABLE "Artist" ALTER COLUMN "nameLower" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Artist_nameLower_key" ON "Artist"("nameLower");

-- Add index on nameLower for case-insensitive searches
CREATE INDEX IF NOT EXISTS "Artist_nameLower_idx" ON "Artist"("nameLower");

-- Add unique constraint on mbid if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Artist_mbid_key" ON "Artist"("mbid") WHERE "mbid" IS NOT NULL;

-- Add index on mbid for MusicBrainz ID lookups
CREATE INDEX IF NOT EXISTS "Artist_mbid_idx" ON "Artist"("mbid") WHERE "mbid" IS NOT NULL;

-- AlterTable: Add titleLower column to Track
ALTER TABLE "Track" ADD COLUMN IF NOT EXISTS "titleLower" TEXT;

-- Populate titleLower with lowercase version of title
UPDATE "Track" SET "titleLower" = LOWER("title") WHERE "titleLower" IS NULL;

-- Make titleLower NOT NULL
ALTER TABLE "Track" ALTER COLUMN "titleLower" SET NOT NULL;

-- Add index on titleLower for case-insensitive searches
CREATE INDEX IF NOT EXISTS "Track_titleLower_idx" ON "Track"("titleLower");

-- Add unique constraint on mbid if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Track_mbid_key" ON "Track"("mbid") WHERE "mbid" IS NOT NULL;

-- Add index on mbid for MusicBrainz ID lookups
CREATE INDEX IF NOT EXISTS "Track_mbid_idx" ON "Track"("mbid") WHERE "mbid" IS NOT NULL;

-- AlterTable: Add index on User.email if it doesn't exist
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email") WHERE "email" IS NOT NULL;

-- AlterTable: Add composite indexes to Listen for time-based queries
CREATE INDEX IF NOT EXISTS "Listen_userId_playedAt_idx" ON "Listen"("userId", "playedAt");
CREATE INDEX IF NOT EXISTS "Listen_trackId_playedAt_idx" ON "Listen"("trackId", "playedAt");
CREATE INDEX IF NOT EXISTS "Listen_userId_trackId_playedAt_idx" ON "Listen"("userId", "trackId", "playedAt");
CREATE INDEX IF NOT EXISTS "Listen_source_playedAt_idx" ON "Listen"("source", "playedAt");


