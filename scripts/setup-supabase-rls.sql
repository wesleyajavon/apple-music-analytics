-- ⚠️ ARCHITECTURE CHECK
-- Run ONLY if your Prisma tables live in Supabase Postgres (DATABASE_URL → supabase.co).
--
-- If you use Neon for DATABASE_URL and Supabase ONLY for Auth + Storage:
--   → DO NOT run this script in Supabase SQL Editor (tables do not exist there).
--   → App data is protected by Prisma + session auth in Next.js API routes.
--   → Supabase RLS on app tables is not applicable in that split setup.
--   → Keep using scripts/setup-supabase-avatar-storage.sql for Storage RLS only.
--
-- Run in Supabase SQL Editor only when Postgres and Auth share the same Supabase project.
-- Prisma uses the postgres/service role and bypasses RLS — this protects
-- direct PostgREST access via anon/authenticated keys.
--
-- Safe to re-run (idempotent policies).

-- ---------------------------------------------------------------------------
-- User-owned tables
-- ---------------------------------------------------------------------------

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpotifyConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Listen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReplayYearly" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReplayTopArtist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReplayTopTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReplayTopAlbum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaletteArtistDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaletteTrackDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportGenreBackfillJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaletteSuggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaletteSuggestionDecision" ENABLE ROW LEVEL SECURITY;

-- Shared catalog tables (no direct API reads for clients)
ALTER TABLE "Artist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Track" ENABLE ROW LEVEL SECURITY;

-- User profile
DROP POLICY IF EXISTS "Users read own profile" ON "User";
CREATE POLICY "Users read own profile"
ON "User" FOR SELECT TO authenticated
USING (id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users update own profile" ON "User";
CREATE POLICY "Users update own profile"
ON "User" FOR UPDATE TO authenticated
USING (id = (select auth.uid())::text)
WITH CHECK (id = (select auth.uid())::text);

-- Generic helper pattern: userId column
DROP POLICY IF EXISTS "Users manage own consents" ON "UserConsent";
CREATE POLICY "Users manage own consents"
ON "UserConsent" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own spotify connection" ON "SpotifyConnection";
CREATE POLICY "Users manage own spotify connection"
ON "SpotifyConnection" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own listens" ON "Listen";
CREATE POLICY "Users manage own listens"
ON "Listen" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own replay years" ON "ReplayYearly";
CREATE POLICY "Users manage own replay years"
ON "ReplayYearly" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own replay top artists" ON "ReplayTopArtist";
CREATE POLICY "Users manage own replay top artists"
ON "ReplayTopArtist" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopArtist"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopArtist"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Users manage own replay top tracks" ON "ReplayTopTrack";
CREATE POLICY "Users manage own replay top tracks"
ON "ReplayTopTrack" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopTrack"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopTrack"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Users manage own replay top albums" ON "ReplayTopAlbum";
CREATE POLICY "Users manage own replay top albums"
ON "ReplayTopAlbum" FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopAlbum"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "ReplayYearly" ry
    WHERE ry.id = "ReplayTopAlbum"."replayYearlyId"
      AND ry."userId" = (select auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Users manage own palette artist decisions" ON "PaletteArtistDecision";
CREATE POLICY "Users manage own palette artist decisions"
ON "PaletteArtistDecision" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own palette track decisions" ON "PaletteTrackDecision";
CREATE POLICY "Users manage own palette track decisions"
ON "PaletteTrackDecision" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own genre backfill jobs" ON "ImportGenreBackfillJob";
CREATE POLICY "Users manage own genre backfill jobs"
ON "ImportGenreBackfillJob" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own palette suggestions" ON "PaletteSuggestion";
CREATE POLICY "Users manage own palette suggestions"
ON "PaletteSuggestion" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users manage own palette suggestion decisions" ON "PaletteSuggestionDecision";
CREATE POLICY "Users manage own palette suggestion decisions"
ON "PaletteSuggestionDecision" FOR ALL TO authenticated
USING ("userId" = (select auth.uid())::text)
WITH CHECK ("userId" = (select auth.uid())::text);

-- Deny direct catalog reads via Data API (app uses Prisma server-side)
DROP POLICY IF EXISTS "No direct artist reads via API" ON "Artist";
CREATE POLICY "No direct artist reads via API"
ON "Artist" FOR SELECT TO authenticated
USING (false);

DROP POLICY IF EXISTS "No direct track reads via API" ON "Track";
CREATE POLICY "No direct track reads via API"
ON "Track" FOR SELECT TO authenticated
USING (false);

-- Revoke broad grants from anon role on sensitive tables (defense in depth)
REVOKE ALL ON TABLE "User" FROM anon;
REVOKE ALL ON TABLE "UserConsent" FROM anon;
REVOKE ALL ON TABLE "SpotifyConnection" FROM anon;
REVOKE ALL ON TABLE "Listen" FROM anon;
REVOKE ALL ON TABLE "ReplayYearly" FROM anon;
REVOKE ALL ON TABLE "ReplayTopArtist" FROM anon;
REVOKE ALL ON TABLE "ReplayTopTrack" FROM anon;
REVOKE ALL ON TABLE "ReplayTopAlbum" FROM anon;
REVOKE ALL ON TABLE "PaletteArtistDecision" FROM anon;
REVOKE ALL ON TABLE "PaletteTrackDecision" FROM anon;
REVOKE ALL ON TABLE "ImportGenreBackfillJob" FROM anon;
REVOKE ALL ON TABLE "PaletteSuggestion" FROM anon;
REVOKE ALL ON TABLE "PaletteSuggestionDecision" FROM anon;
REVOKE ALL ON TABLE "Artist" FROM anon;
REVOKE ALL ON TABLE "Track" FROM anon;
