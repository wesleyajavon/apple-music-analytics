/**
 * AI commentary for /dashboard/artists/trends.
 * Compact deterministic payload (bounded timeline) — aligned with genre trends commentary.
 */

import { RateLimitError } from "groq-sdk";
import {
  createGroqChatCompletion,
  GROQ_DEFAULT_MODEL,
} from "@/lib/services/ai/groq-chat";
import type { ArtistTrendsChartDataPoint } from "@/lib/dto/artist";
import type {
  ArtistTrendsCompactPayload,
  ArtistTrendsPerArtistMetrics,
  ArtistTrendsTimeFilterMode,
} from "@/lib/dto/artist-trends-ai";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import { getLanguageName, type AiLocale } from "./locale-utils";

const MAX_TIMELINE_BUCKETS = 42;
const MAX_ARTISTS_IN_ANALYSIS = 14;

function periodAggregationLabel(
  period: GenreTrendPeriod,
  labels: ReturnType<typeof getAiInsightsLabels>["artistTrends"]
): string {
  switch (period) {
    case "day":
      return labels.aggregationDay;
    case "week":
      return labels.aggregationWeek;
    case "month":
      return labels.aggregationMonth;
  }
}

/** Unique JSON keys for timeline (duplicate artist names disambiguated). */
function buildArtistDisplayKeys(
  artistIds: string[],
  idToName: Map<string, string>
): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const id of artistIds) {
    const base = idToName.get(id) ?? id;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const key = n > 1 ? `${base} (${id.slice(0, 8)})` : base;
    out.set(id, key);
  }
  return out;
}

function computePerArtistMetrics(
  data: ArtistTrendsChartDataPoint[],
  artistIds: string[],
  idToName: Map<string, string>
): ArtistTrendsPerArtistMetrics[] {
  if (data.length === 0 || artistIds.length === 0) return [];
  const mid = Math.ceil(data.length / 2);
  const first = data.slice(0, mid);
  const second = data.slice(mid);

  const selectionTotal = artistIds.reduce((sum, id) => {
    return (
      sum + data.reduce((s, row) => s + (Number(row[id]) || 0), 0)
    );
  }, 0);

  return artistIds.map((artistId) => {
    const artistName = idToName.get(artistId) ?? artistId;
    const firstHalf = first.reduce(
      (sum, row) => sum + (Number(row[artistId]) || 0),
      0
    );
    const secondHalf = second.reduce(
      (sum, row) => sum + (Number(row[artistId]) || 0),
      0
    );
    const totalListens = firstHalf + secondHalf;
    const delta = secondHalf - firstHalf;
    const base = firstHalf || 1;
    const deltaPercent = Math.round((delta / base) * 100);
    let direction: "up" | "down" | "stable" = "stable";
    if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";

    let peakBucketDate = data[0].date;
    let peakBucketLabel = String(data[0].formattedDate);
    let peakListenCount = 0;
    for (const row of data) {
      const v = Number(row[artistId]) || 0;
      if (v > peakListenCount) {
        peakListenCount = v;
        peakBucketDate = row.date;
        peakBucketLabel = String(row.formattedDate);
      }
    }

    const shareOfSelectionPct =
      selectionTotal > 0
        ? Math.round((totalListens / selectionTotal) * 1000) / 10
        : 0;

    return {
      artistId,
      artistName,
      totalListens,
      shareOfSelectionPct,
      firstHalfListens: firstHalf,
      secondHalfListens: secondHalf,
      delta,
      deltaPercent,
      direction,
      peakBucketDate,
      peakBucketLabel,
      peakListenCount,
    };
  });
}

function buildTimeline(
  data: ArtistTrendsChartDataPoint[],
  artistIds: string[],
  displayKeys: Map<string, string>
): {
  timeline: ArtistTrendsCompactPayload["timeline"];
  timelineMode: "full" | "downsampled";
  stride?: number;
} {
  const rowListens = (row: ArtistTrendsChartDataPoint) =>
    Object.fromEntries(
      artistIds.map((id) => [
        displayKeys.get(id) ?? id,
        Number(row[id]) || 0,
      ])
    );

  if (data.length <= MAX_TIMELINE_BUCKETS) {
    return {
      timeline: data.map((row) => ({
        date: row.date,
        formattedDate: String(row.formattedDate),
        listens: rowListens(row),
      })),
      timelineMode: "full" as const,
    };
  }

  const stride = Math.ceil(data.length / MAX_TIMELINE_BUCKETS);
  const picks = new Set<number>();
  for (let i = 0; i < data.length; i += stride) picks.add(i);
  picks.add(0);
  picks.add(data.length - 1);
  let indices = [...picks].sort((a, b) => a - b);
  if (indices.length > MAX_TIMELINE_BUCKETS) {
    const thin = Math.ceil(indices.length / MAX_TIMELINE_BUCKETS);
    indices = indices.filter((_, i) => i % thin === 0);
    indices.push(data.length - 1);
    indices = [...new Set(indices)].sort((a, b) => a - b);
  }

  return {
    timeline: indices.map((i) => {
      const row = data[i];
      return {
        date: row.date,
        formattedDate: String(row.formattedDate),
        listens: rowListens(row),
      };
    }),
    timelineMode: "downsampled" as const,
    stride,
  };
}

export function buildArtistTrendsCompactPayload(
  chartData: ArtistTrendsChartDataPoint[],
  selectedArtistIds: string[],
  idToName: Map<string, string>,
  period: GenreTrendPeriod,
  resolvedRange: { start: string; end: string },
  timeFilterMode: ArtistTrendsTimeFilterMode
): ArtistTrendsCompactPayload | null {
  if (chartData.length === 0 || selectedArtistIds.length === 0) return null;

  const present = new Set<string>();
  for (const k of Object.keys(chartData[0])) {
    if (k !== "date" && k !== "formattedDate") present.add(k);
  }
  let artistIds = selectedArtistIds.filter((id) => present.has(id));
  if (artistIds.length === 0) return null;

  const totals = new Map<string, number>();
  for (const id of artistIds) {
    let t = 0;
    for (const row of chartData) {
      t += Number(row[id]) || 0;
    }
    totals.set(id, t);
  }
  artistIds.sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));

  let artistsCapped = false;
  if (artistIds.length > MAX_ARTISTS_IN_ANALYSIS) {
    artistIds = artistIds.slice(0, MAX_ARTISTS_IN_ANALYSIS);
    artistsCapped = true;
  }

  const displayKeys = buildArtistDisplayKeys(artistIds, idToName);
  const perArtist = computePerArtistMetrics(chartData, artistIds, idToName);
  const tl = buildTimeline(chartData, artistIds, displayKeys);

  return {
    meta: {
      period,
      timeFilterMode,
      rangeStart: resolvedRange.start,
      rangeEnd: resolvedRange.end,
      bucketCount: chartData.length,
      selectedArtistCount: selectedArtistIds.length,
      artistsCapped,
      cappedToTopN: artistsCapped ? MAX_ARTISTS_IN_ANALYSIS : undefined,
      timelineMode: tl.timelineMode,
      timelineStride: tl.stride,
      maxTimelineBuckets: MAX_TIMELINE_BUCKETS,
    },
    perArtist,
    timeline: tl.timeline,
  };
}

function buildSystemPrompt(locale: AiLocale, light: boolean): string {
  const lang = getLanguageName(locale);
  if (light) {
    return `You are a friendly music data interpreter. You summarize per-artist listening trends shown in a dashboard chart.

STRICT RULES:
1. Use ONLY the structured context provided. Do not invent artists, dates, or numbers.
2. Produce 1-2 short paragraphs (3-6 sentences total).
3. LANGUAGE: ${lang}. Respond entirely in this language.
4. Tone: accessible, human, no buzzwords. Avoid exact percentages and precise counts if possible.
5. Refer to artists by name as given in the context.
6. No formal "In conclusion" or "Introduction".`;
  }
  return `You are a technical music listening analyst. You explain multi-line artist trend charts from aggregated data.

STRICT RULES:
1. Use ONLY the structured context provided. Do not invent data.
2. Produce 1-2 short paragraphs (3-6 sentences total).
3. LANGUAGE: ${lang}. Respond entirely in this language.
4. Cite concrete metrics from the context (counts, percentages, bucket labels, date range, aggregation). Use artist names from the context.
5. No formal introduction or conclusion.`;
}

function buildUserPrompt(
  payload: ArtistTrendsCompactPayload,
  locale: AiLocale,
  light: boolean
): string {
  const labels = getAiInsightsLabels(locale).artistTrends;
  const agg = periodAggregationLabel(payload.meta.period, labels);
  const timeDesc =
    payload.meta.timeFilterMode === "all_time"
      ? labels.filterAllData
      : `${labels.filterCustomRange}: ${payload.meta.rangeStart} → ${payload.meta.rangeEnd}`;

  const timelineNote =
    payload.meta.timelineMode === "full"
      ? labels.timelineNoteFull
      : `${labels.timelineNoteDownsampled}${
          payload.meta.timelineStride
            ? ` (stride ≈ ${payload.meta.timelineStride} buckets)`
            : ""
        }`;

  const capNote = payload.meta.artistsCapped
    ? `${labels.artistsCappedNote} (top ${payload.meta.cappedToTopN}).`
    : "";

  const header = light ? labels.promptIntroLight : labels.promptIntroTechnical;
  const instruction = light
    ? labels.promptInstructionLight
    : labels.promptInstructionTechnical;

  const summary = getAiInsightsLabels(locale).summary;
  const listensUnit = summary.listens;

  const artistBlocks = payload.perArtist
    .map((m) => {
      if (light) {
        return (
          `- ${m.artistName}: ${labels.totalListens} — overall tendency ${m.direction}; ${labels.peakBucket} ${m.peakBucketLabel}.`
        );
      }
      return (
        `- ${m.artistName}: ${labels.totalListens} ${m.totalListens}; ${labels.shareOfSelection} ${m.shareOfSelectionPct}%; ` +
        `${labels.firstHalf} ${m.firstHalfListens} / ${labels.secondHalf} ${m.secondHalfListens}; ` +
        `${labels.deltaVsFirstHalf} ${m.delta >= 0 ? "+" : ""}${m.delta} (${m.delta >= 0 ? "+" : ""}${m.deltaPercent}%); ` +
        `${labels.peakBucket} ${m.peakBucketLabel} (${m.peakListenCount} ${listensUnit}).`
      );
    })
    .join("\n");

  const timelineLines = payload.timeline
    .map(
      (row) =>
        `${row.formattedDate} (${row.date}): ${JSON.stringify(row.listens)}`
    )
    .join("\n");

  return `${header}

## ${summary.period}
- ${timeDesc}
- ${agg}
- ${labels.bucketsInSeries}: ${payload.meta.bucketCount}
- ${labels.artistsInAnalysis}: ${payload.perArtist.map((p) => p.artistName).join(", ")}${capNote ? `\n- ${capNote}` : ""}

## ${labels.firstHalf} / ${labels.secondHalf}
${artistBlocks}

## ${labels.timelineSection}
${timelineNote}

${timelineLines}

---

${instruction}`;
}

const GROQ_RATE_LIMIT_EXTRA_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function groqRateLimitRetryDelayMs(
  headers: RateLimitError["headers"] | undefined
): number {
  if (!headers) return 12_000;
  const h = headers as Record<string, string | undefined>;
  const retryAfter = h["retry-after"];
  if (retryAfter) {
    const sec = parseFloat(retryAfter);
    if (!Number.isNaN(sec)) {
      return Math.min(Math.ceil(sec * 1000) + 250, 90_000);
    }
  }
  const resetTokens = h["x-ratelimit-reset-tokens"];
  if (resetTokens) {
    const sec = parseFloat(String(resetTokens).replace(/s$/i, ""));
    if (!Number.isNaN(sec)) {
      return Math.min(Math.ceil(sec * 1000) + 250, 90_000);
    }
  }
  return 12_000;
}

export async function generateArtistTrendsCommentary(
  payload: ArtistTrendsCompactPayload,
  locale: AiLocale = "fr",
  light = false
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "";
  }

  const userPrompt = buildUserPrompt(payload, locale, light);

  const params = {
    model: GROQ_DEFAULT_MODEL,
    messages: [
      { role: "system" as const, content: buildSystemPrompt(locale, light) },
      { role: "user" as const, content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 450,
  };

  for (let outer = 0; outer < GROQ_RATE_LIMIT_EXTRA_ATTEMPTS; outer++) {
    try {
      const response = await createGroqChatCompletion(params);
      const content = response.choices[0]?.message?.content?.trim();
      return content ?? "";
    } catch (err) {
      const is429 =
        err instanceof RateLimitError ||
        (err instanceof Error &&
          "status" in err &&
          (err as { status?: number }).status === 429);
      if (!is429) throw err;
      if (outer === GROQ_RATE_LIMIT_EXTRA_ATTEMPTS - 1) {
        return "";
      }
      await sleep(
        groqRateLimitRetryDelayMs(
          err instanceof RateLimitError ? err.headers : undefined
        )
      );
    }
  }

  return "";
}

export { MAX_TIMELINE_BUCKETS, MAX_ARTISTS_IN_ANALYSIS };
