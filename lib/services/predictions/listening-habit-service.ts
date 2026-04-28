/**
 * Deterministic listening habit prediction ("When will I listen?") from history.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transformBigIntToNumber } from "@/lib/dto/transformers";
import type {
  ListeningHabitPrediction,
  ListeningHabitResponse,
} from "@/lib/dto/predictions";

const MIN_LISTENS_RECOMMENDED = 30;

const FR_DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

function hourLabel(start: number, end: number): string {
  return `${start}h–${end}h`;
}

/** JS getDay()-style DOW: 0=Sun … 6=Sat; Postgres EXTRACT(DOW) matches. */
function buildHourBucketsForWeekday(dow: number, userId: string) {
  return Prisma.sql`
    SELECT
      EXTRACT(HOUR FROM l."playedAt")::int AS hour,
      COUNT(*)::bigint AS listens
    FROM "Listen" l
    WHERE l."userId" = ${userId}
      AND EXTRACT(DOW FROM l."playedAt")::int = ${dow}
    GROUP BY hour
    ORDER BY hour ASC
  `;
}

function buildGenreBucketsForWeekdayHourRange(
  dow: number,
  startHour: number,
  endHour: number,
  userId: string
) {
  return Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM(t."genre"), ''), 'Inconnu') AS genre,
      COUNT(*)::bigint AS listens
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."userId" = ${userId}
      AND EXTRACT(DOW FROM l."playedAt")::int = ${dow}
      AND EXTRACT(HOUR FROM l."playedAt")::int >= ${startHour}
      AND EXTRACT(HOUR FROM l."playedAt")::int <= ${endHour}
    GROUP BY genre
    ORDER BY listens DESC
  `;
}

/**
 * Computes the best 3-hour window [start, start+2] by total listens on the given weekday.
 */
function bestThreeHourWindow(
  hourToCount: Map<number, number>
): { startHour: number; endHour: number; listensInWindow: number; peakHour: number } {
  let bestStart = 0;
  let bestSum = -1;

  for (let start = 0; start <= 21; start++) {
    const end = start + 2;
    let sum = 0;
    for (let h = start; h <= end; h++) {
      sum += hourToCount.get(h) ?? 0;
    }
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }

  let peakHour = bestStart;
  let peakListen = -1;
  for (let h = bestStart; h <= bestStart + 2; h++) {
    const c = hourToCount.get(h) ?? 0;
    if (c > peakListen) {
      peakListen = c;
      peakHour = h;
    }
  }

  return {
    startHour: bestStart,
    endHour: bestStart + 2,
    listensInWindow: bestSum,
    peakHour,
  };
}

export async function getListeningHabitPrediction(
  userId: string
): Promise<ListeningHabitResponse> {
  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total FROM "Listen" l WHERE l."userId" = ${userId}
  `);
  const totalListens =
    typeof totalRows[0]?.total === "bigint"
      ? Number(totalRows[0].total)
      : Number(totalRows[0]?.total ?? 0);

  if (totalListens < MIN_LISTENS_RECOMMENDED) {
    return {
      insufficientData: true,
      minListensRecommended: MIN_LISTENS_RECOMMENDED,
      actualListens: totalListens,
      message:
        "Données insuffisantes pour une prédiction fiable. Importez davantage d’historique d’écoute.",
    };
  }

  const rangeRows = await prisma.$queryRaw<
    Array<{ min_d: Date; max_d: Date }>
  >(Prisma.sql`
    SELECT MIN(l."playedAt") AS min_d, MAX(l."playedAt") AS max_d
    FROM "Listen" l
    WHERE l."userId" = ${userId}
  `);

  const row = rangeRows[0];
  const daysOfData =
    row?.min_d && row?.max_d
      ? Math.max(
          1,
          Math.ceil(
            (row.max_d.getTime() - row.min_d.getTime()) / (86400 * 1000)
          ) + 1
        )
      : 1;

  const dow = new Date().getDay(); // user's server TZ “today”; consistent with hourly extraction

  const hourRows = await prisma.$queryRaw<
    Array<{ hour: number; listens: bigint }>
  >(buildHourBucketsForWeekday(dow, userId));

  const hourMap = new Map<number, number>();
  for (const r of hourRows) {
    hourMap.set(
      r.hour,
      transformBigIntToNumber({ listens: r.listens }).listens
    );
  }

  const totalForDow = [...hourMap.values()].reduce((a, b) => a + b, 0);

  if (totalForDow === 0) {
    return {
      insufficientData: true,
      minListensRecommended: MIN_LISTENS_RECOMMENDED,
      actualListens: totalListens,
      message:
        "Pas assez d’écoute ce jour-là dans l’historique pour extrapoler une fenêtre.",
    };
  }

  const { startHour, endHour, listensInWindow, peakHour } =
    bestThreeHourWindow(hourMap);

  const confidenceScore = Math.min(
    100,
    Math.round((listensInWindow / totalForDow) * 100)
  );

  const genreRows = await prisma.$queryRaw<
    Array<{ genre: string; listens: bigint }>
  >(buildGenreBucketsForWeekdayHourRange(dow, startHour, endHour, userId));

  const genreDistributionInWindow: Record<string, number> = {};
  for (const gr of genreRows) {
    const n = transformBigIntToNumber({ listens: gr.listens }).listens;
    genreDistributionInWindow[gr.genre] = n;
  }

  let predictedGenre = "—";
  const entries = Object.entries(genreDistributionInWindow);
  if (entries.length > 0) {
    entries.sort((a, b) => b[1] - a[1]);
    predictedGenre = entries[0][0];
  }

  const dayName = FR_DAY_NAMES[dow] ?? "?";
  const assumptions: string[] = [
    `Fenêtre maximisant les écoutes du ${dayName} sur votre historique (fenêtre de 3 h).`,
  ];

  const prediction: ListeningHabitPrediction = {
    timeWindow: {
      startHour,
      endHour,
      label: hourLabel(startHour, endHour),
    },
    confidenceScore,
    predictedGenre,
    supportingMetrics: {
      totalListensAnalyzed: totalListens,
      daysOfData,
      listensInWindow,
      peakHour,
      dayOfWeek: dow,
      dayName,
      genreDistributionInWindow,
      assumptions,
    },
  };

  return prediction;
}
