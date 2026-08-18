import {
  GENRE_AI_NUDGE_MIN_DISTINCT_TRACKS,
  GENRE_AI_NUDGE_UNKNOWN_RATIO_MIN_PCT,
} from "@/lib/constants/genre-ai-nudge-notification";

export type GroqGenreBackfillEligibility = {
  groqConfigured: boolean;
  unknownRatio: number;
  unknownTrackCount: number;
  totalTrackCount: number;
};

/**
 * Bibliothèque importée mais encore trop peu classée ( Palettes / Groq ).
 * Ne dépend pas de Groq : Palette reste une issue même sans clé.
 */
export function isUnsortedGenreCoverage(
  eligibility: GroqGenreBackfillEligibility | null | undefined,
): boolean {
  if (!eligibility) return false;
  if (eligibility.totalTrackCount < GENRE_AI_NUDGE_MIN_DISTINCT_TRACKS) return false;
  if (eligibility.unknownTrackCount < 1) return false;
  if (eligibility.unknownRatio < GENRE_AI_NUDGE_UNKNOWN_RATIO_MIN_PCT) return false;
  return true;
}

/** Même grille que les notifications tableau de bord (majorité Unknown + biblio min. + Groq). */
export function isGroqGenreNudgeEligible(
  eligibility: GroqGenreBackfillEligibility | null | undefined,
): boolean {
  if (!eligibility?.groqConfigured) return false;
  return isUnsortedGenreCoverage(eligibility);
}
