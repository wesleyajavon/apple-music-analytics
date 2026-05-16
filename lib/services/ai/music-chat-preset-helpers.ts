import type {
  MusicChatDateRangeContext,
  MusicChatPresetArgs,
} from "@/lib/dto/music-chat";

/** Calendar year for “last year” genre preset: year(endDate context) − 1, else UTC now − 1. */
export function resolveGenreQuickPresetYear(
  presetArgs: MusicChatPresetArgs | undefined,
  dateRange?: MusicChatDateRangeContext
): number {
  if (
    typeof presetArgs?.genreYear === "number" &&
    Number.isFinite(presetArgs.genreYear)
  ) {
    return Math.trunc(presetArgs.genreYear);
  }
  const end = dateRange?.endDate;
  const y =
    end && end.length >= 4
      ? Number.parseInt(end.slice(0, 4), 10)
      : new Date().getUTCFullYear();
  return (Number.isFinite(y) ? y : new Date().getUTCFullYear()) - 1;
}
