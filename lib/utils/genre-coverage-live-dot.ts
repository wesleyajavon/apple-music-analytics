/**
 * Live-dot tone for genre trends: amber while some tracks still need a genre
 * (same condition as GenreAccuracyChooser), emerald once every track is mapped.
 */
export function genreCoverageLiveDotTone(
  unknownTrackCount: number | null | undefined,
  loaded: boolean
): "amber" | "emerald" {
  if (!loaded) return "amber";
  if (unknownTrackCount === 0) return "emerald";
  return "amber";
}
