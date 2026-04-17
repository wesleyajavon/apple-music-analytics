-- Genre backfill jobs now use Groq LLM by default (Spotify API path removed).
ALTER TABLE "ImportGenreBackfillJob" ALTER COLUMN "provider" SET DEFAULT 'groq';

-- Fail any stale pending Spotify jobs so the worker does not block on them.
UPDATE "ImportGenreBackfillJob"
SET
  "status" = 'failed',
  "errorMessage" = 'Spotify genre backfill was removed; start a new job from onboarding (Groq).',
  "finishedAt" = NOW()
WHERE "provider" = 'spotify' AND "status" IN ('pending', 'running');
