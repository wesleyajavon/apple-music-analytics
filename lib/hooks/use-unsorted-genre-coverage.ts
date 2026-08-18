"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GENRE_AI_NUDGE_UNKNOWN_RATIO_MIN_PCT } from "@/lib/constants/genre-ai-nudge-notification";
import { genreBackfillKeys } from "@/lib/hooks/query-keys";
import { useGenres } from "@/lib/hooks/use-listening";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import {
  isUnsortedGenreCoverage,
  type GroqGenreBackfillEligibility,
} from "@/lib/utils/genre-ai-nudge-eligibility";
import { unknownListenSharePercent } from "@/lib/utils/genre-unknown-label";

type EligibilityPayload = {
  eligibility: GroqGenreBackfillEligibility | null;
};

async function fetchGenreBackfillEligibility(): Promise<EligibilityPayload> {
  const res = await fetch(
    "/api/user/onboarding/import/genre-backfill/status?includeEligibility=1",
    { credentials: "include" }
  );
  if (!res.ok) {
    throw new Error(`genre-backfill eligibility ${res.status}`);
  }
  const data = (await res.json().catch(() => ({}))) as {
    eligibility?: GroqGenreBackfillEligibility | null;
  };
  return { eligibility: data.eligibility ?? null };
}

export function useUnsortedGenreCoverage(options: {
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  userId?: string | null;
}) {
  const { enabled, startDate, endDate, userId } = options;
  const blockedByActiveJob = useInteractiveAiBlockedByGenreBackfill();

  const eligibilityQuery = useQuery({
    queryKey: genreBackfillKeys.eligibility(),
    queryFn: fetchGenreBackfillEligibility,
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: false,
  });

  const genresQuery = useGenres(startDate, endDate, userId ?? undefined, {
    enabled: enabled && Boolean(startDate && endDate),
  });

  return useMemo(() => {
    const eligibility = eligibilityQuery.data?.eligibility ?? null;
    const libraryUnsorted = isUnsortedGenreCoverage(eligibility);
    const periodUnknownShare = unknownListenSharePercent(genresQuery.data?.data);
    const periodUnsorted = periodUnknownShare >= GENRE_AI_NUDGE_UNKNOWN_RATIO_MIN_PCT;
    const unknownRatio = Math.max(eligibility?.unknownRatio ?? 0, periodUnknownShare);

    return {
      shouldInvite:
        enabled && !blockedByActiveJob && (libraryUnsorted || periodUnsorted),
      unknownRatio,
      groqConfigured: eligibility?.groqConfigured ?? false,
    };
  }, [
    blockedByActiveJob,
    eligibilityQuery.data?.eligibility,
    enabled,
    genresQuery.data?.data,
  ]);
}
