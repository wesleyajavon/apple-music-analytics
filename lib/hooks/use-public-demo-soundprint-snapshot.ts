"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  useGenres,
  useOverviewStats,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import {
  buildPublicDemoSoundprintSnapshot,
  type PublicDemoSoundprintSnapshot,
} from "@/lib/utils/public-demo-soundprint-snapshot";

export function usePublicDemoSoundprintSnapshot(
  startDate: string | undefined,
  endDate: string | undefined,
  userId: string | undefined,
  enabled: boolean
): {
  snapshot: PublicDemoSoundprintSnapshot | null;
  isLoading: boolean;
  error: Error | null;
} {
  const locale = useLocale();
  const hasValidRange = Boolean(startDate && endDate);
  const queryEnabled = enabled && hasValidRange;

  const overview = useOverviewStats(startDate, endDate, userId, {
    enabled: queryEnabled,
  });
  const genres = useGenres(startDate, endDate, userId, {
    enabled: queryEnabled,
  });
  const temporal = useTemporalAnalysis(startDate, endDate, userId, {
    enabled: queryEnabled,
  });

  const snapshot = useMemo(() => {
    if (!overview.data) return null;
    return buildPublicDemoSoundprintSnapshot({
      overview: overview.data,
      genres: genres.data,
      temporal: temporal.data,
      locale,
    });
  }, [overview.data, genres.data, temporal.data, locale]);

  const isLoading =
    queryEnabled &&
    (overview.isLoading || genres.isLoading || temporal.isLoading);

  const error = overview.error ?? genres.error ?? temporal.error ?? null;

  return { snapshot, isLoading, error };
}
