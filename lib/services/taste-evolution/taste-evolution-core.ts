/**
 * Taste Evolution Core - Pure, deterministic trend computation.
 *
 * ANALYTICAL ASSUMPTIONS (documented for reproducibility):
 * - Weeks use ISO week (Monday start). DATE_TRUNC('week', ...) in PostgreSQL.
 * - Noise filtering: genre share changes < 2pp (percentage points) are ignored.
 * - Minimum listens per week: 10 (below this, diversity metrics are unreliable).
 * - Top N for artists: 15 (rank movements beyond this are noisy).
 * - Entropy uses natural log; 0*ln(0) = 0 by convention.
 *
 * LIMITATIONS of weekly analysis:
 * - Short-term patterns (e.g. holiday spikes) can dominate.
 * - Genre data quality depends on track.genre and ARTIST_TO_GENRE_MAP.
 * - Week boundaries may split listening sessions arbitrarily.
 */

import type {
  WeekTimeRange,
  WeekToWeekTrend,
  GenreDelta,
  ArtistRankMovement,
  DominantShift,
  TrendClassification,
} from "@/lib/dto/taste-evolution";

/** Raw weekly aggregates from DB (input to pure functions) */
export interface WeeklyAggregate {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;
  listens: number;
  uniqueGenres: number;
  uniqueArtists: number;
  genreDistribution: Array<{ genre: string; count: number }>;
  topArtists: Array<{ artistName: string; listenCount: number }>;
}

// --- Noise filtering / thresholds ---
/** Minimum percentage change (in %) to consider a genre shift meaningful */
const GENRE_DELTA_THRESHOLD_PCT = 2;
/** Minimum listens per week for meaningful analysis */
const MIN_LISTENS_PER_WEEK = 10;
/** Top N artists to track for rank movements */
const TOP_ARTISTS_N = 15;
/** Minimum rank change (positions) to consider meaningful */
const RANK_CHANGE_THRESHOLD = 1;

/**
 * Format week label for display (e.g. "Semaine du 15 jan.")
 */
export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Compute week end (Sunday) from week start (Monday).
 */
export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute Shannon entropy of a distribution (genres as proportions).
 * Higher = more diverse. Pure function.
 */
export function computeEntropy(genreDistribution: Array<{ genre: string; count: number }>): number {
  const total = genreDistribution.reduce((sum, g) => sum + g.count, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const g of genreDistribution) {
    const p = g.count / total;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  }
  return entropy;
}

/**
 * Compute week-over-week genre deltas.
 * Filters out changes below GENRE_DELTA_THRESHOLD_PCT (noise).
 */
export function computeGenreDeltas(
  prev: WeeklyAggregate,
  curr: WeeklyAggregate
): { emerging: GenreDelta[]; declining: GenreDelta[] } {
  const prevTotal = prev.listens || 1;
  const currTotal = curr.listens || 1;
  const genreMap = new Map<string, { prevCount: number; currCount: number }>();

  for (const g of prev.genreDistribution) {
    genreMap.set(g.genre, { prevCount: g.count, currCount: 0 });
  }
  for (const g of curr.genreDistribution) {
    const existing = genreMap.get(g.genre);
    if (existing) {
      existing.currCount = g.count;
    } else {
      genreMap.set(g.genre, { prevCount: 0, currCount: g.count });
    }
  }

  const emerging: GenreDelta[] = [];
  const declining: GenreDelta[] = [];

  for (const [genre, { prevCount, currCount }] of genreMap) {
    const prevPct = (prevCount / prevTotal) * 100;
    const currPct = (currCount / currTotal) * 100;
    const deltaPct = currPct - prevPct;

    if (Math.abs(deltaPct) < GENRE_DELTA_THRESHOLD_PCT) continue;

    const delta: GenreDelta = {
      genre,
      previousPct: prevPct,
      currentPct: currPct,
      deltaPct,
      previousCount: prevCount,
      currentCount: currCount,
    };
    if (deltaPct > 0) {
      emerging.push(delta);
    } else {
      declining.push(delta);
    }
  }

  emerging.sort((a, b) => b.deltaPct - a.deltaPct);
  declining.sort((a, b) => a.deltaPct - b.deltaPct);

  return { emerging, declining };
}

/**
 * Compute artist rank movements between two weeks.
 * Only considers top TOP_ARTISTS_N. New artists get previousRank = null.
 */
export function computeArtistRankMovements(
  prev: WeeklyAggregate,
  curr: WeeklyAggregate
): ArtistRankMovement[] {
  const prevTop = prev.topArtists.slice(0, TOP_ARTISTS_N);
  const currTop = curr.topArtists.slice(0, TOP_ARTISTS_N);
  const prevRankMap = new Map<string, { rank: number; count: number }>();
  prevTop.forEach((a, i) => prevRankMap.set(a.artistName, { rank: i + 1, count: a.listenCount }));
  const currRankMap = new Map<string, { rank: number; count: number }>();
  currTop.forEach((a, i) => currRankMap.set(a.artistName, { rank: i + 1, count: a.listenCount }));

  const movements: ArtistRankMovement[] = [];
  for (const a of currTop) {
    const prevInfo = prevRankMap.get(a.artistName);
    const currRank = currRankMap.get(a.artistName)!.rank;
    const currCount = currRankMap.get(a.artistName)!.count;
    const previousRank = prevInfo?.rank ?? null;
    const previousCount = prevInfo?.count ?? 0;
    const rankChange = previousRank !== null ? previousRank - currRank : TOP_ARTISTS_N;

    if (Math.abs(rankChange) < RANK_CHANGE_THRESHOLD && previousRank !== null) continue;

    movements.push({
      artistName: a.artistName,
      previousRank,
      currentRank: currRank,
      rankChange,
      previousCount,
      currentCount: currCount,
    });
  }

  movements.sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange));
  return movements;
}

/**
 * Classify trend based on computed deltas.
 *
 * Classification rules (deterministic):
 * - expansion: genre count increased AND diversity (entropy) increased
 * - consolidation: genre count decreased AND diversity decreased
 * - exploration: new genres in top distribution OR new artists in top N
 * - regression: previously declining genres/artists return to prominence
 * - stable: none of the above apply
 */
export function classifyTrend(
  prev: WeeklyAggregate,
  curr: WeeklyAggregate,
  emergingGenres: GenreDelta[],
  decliningGenres: GenreDelta[],
  artistMovements: ArtistRankMovement[]
): TrendClassification {
  const genreCountUp = curr.uniqueGenres > prev.uniqueGenres;
  const genreCountDown = curr.uniqueGenres < prev.uniqueGenres;
  const prevEntropy = computeEntropy(prev.genreDistribution);
  const currEntropy = computeEntropy(curr.genreDistribution);
  const entropyUp = currEntropy > prevEntropy;
  const entropyDown = currEntropy < prevEntropy;

  const hasNewGenres = emergingGenres.some((g) => g.previousCount === 0);
  const hasNewArtists = artistMovements.some((m) => m.previousRank === null);
  const hasReturningArtists = artistMovements.some(
    (m) => m.previousRank !== null && m.rankChange > 0
  );

  if (genreCountUp && entropyUp) return "expansion";
  if (genreCountDown && entropyDown) return "consolidation";
  if (hasNewGenres || hasNewArtists) return "exploration";
  if (hasReturningArtists && genreCountDown) return "regression";

  return "stable";
}

/**
 * Build dominant shifts from genres and artists for AI/narrative use.
 */
export function buildDominantShifts(
  emergingGenres: GenreDelta[],
  decliningGenres: GenreDelta[],
  artistMovements: ArtistRankMovement[],
  classification: TrendClassification
): DominantShift[] {
  const shifts: DominantShift[] = [];
  for (const g of emergingGenres.slice(0, 3)) {
    shifts.push({
      type: "genre",
      name: g.genre,
      direction: "up",
      magnitude: g.deltaPct,
      classification,
    });
  }
  for (const g of decliningGenres.slice(0, 3)) {
    shifts.push({
      type: "genre",
      name: g.genre,
      direction: "down",
      magnitude: Math.abs(g.deltaPct),
      classification,
    });
  }
  for (const a of artistMovements.slice(0, 3)) {
    if (a.rankChange !== 0) {
      shifts.push({
        type: "artist",
        name: a.artistName,
        direction: a.rankChange > 0 ? "up" : "down",
        magnitude: Math.abs(a.rankChange),
        classification,
      });
    }
  }
  return shifts;
}

/**
 * Compute a single week-to-week trend from two weekly aggregates.
 * Pure function; no DB access.
 */
export function computeWeekToWeekTrend(
  prev: WeeklyAggregate,
  curr: WeeklyAggregate
): WeekToWeekTrend | null {
  if (prev.listens < MIN_LISTENS_PER_WEEK || curr.listens < MIN_LISTENS_PER_WEEK) {
    return null;
  }

  const { emerging, declining } = computeGenreDeltas(prev, curr);
  const artistMovements = computeArtistRankMovements(prev, curr);
  const classification = classifyTrend(
    prev,
    curr,
    emerging,
    declining,
    artistMovements
  );
  const dominantShifts = buildDominantShifts(
    emerging,
    declining,
    artistMovements,
    classification
  );

  const volumeDelta = curr.listens - prev.listens;
  const volumeDeltaPct = prev.listens === 0 ? (curr.listens > 0 ? 100 : 0) : (volumeDelta / prev.listens) * 100;
  const prevEntropy = computeEntropy(prev.genreDistribution);
  const currEntropy = computeEntropy(curr.genreDistribution);
  const diversityDelta = currEntropy - prevEntropy;

  const prevRange: WeekTimeRange = {
    weekStart: prev.weekStart,
    weekEnd: prev.weekEnd,
    label: formatWeekLabel(prev.weekStart),
  };
  const currRange: WeekTimeRange = {
    weekStart: curr.weekStart,
    weekEnd: curr.weekEnd,
    label: formatWeekLabel(curr.weekStart),
  };

  return {
    timeRange: currRange,
    previousWeekRange: prevRange,
    volumeDelta,
    volumeDeltaPct,
    diversityDelta,
    genreCountPrevious: prev.uniqueGenres,
    genreCountCurrent: curr.uniqueGenres,
    emergingGenres: emerging,
    decliningGenres: declining,
    artistRankMovements: artistMovements,
    dominantShifts,
    classification,
    previousWeekListens: prev.listens,
    currentWeekListens: curr.listens,
  };
}
