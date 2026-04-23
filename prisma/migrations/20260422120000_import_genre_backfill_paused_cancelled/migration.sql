-- AlterEnum: cooperative pause / user cancel for Groq genre backfill jobs
ALTER TYPE "ImportGenreBackfillJobStatus" ADD VALUE 'paused';
ALTER TYPE "ImportGenreBackfillJobStatus" ADD VALUE 'cancelled';
