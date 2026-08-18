"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatDemoCount,
  formatDemoPercentage,
  type PublicDemoSoundprintSnapshot,
} from "@/lib/utils/public-demo-soundprint-snapshot";

export function useTasteProfileDemoCopy(snapshot: PublicDemoSoundprintSnapshot | null) {
  const t = useTranslations("taste-profile");
  const locale = useLocale();

  return useMemo(() => {
    if (!snapshot) return null;

    const genrePct = snapshot.topGenre
      ? formatDemoPercentage(snapshot.topGenre.percentage, locale)
      : "";

    const headline =
      snapshot.topGenre && snapshot.topArtist
        ? t("publicDemoTeaser.headline", {
            genre: snapshot.topGenre.name,
            genrePct,
            artist: snapshot.topArtist.name,
          })
        : snapshot.topGenre
          ? t("publicDemoTeaser.headlineNoArtist", {
              genre: snapshot.topGenre.name,
              genrePct,
            })
          : t("publicDemoTeaser.headlineFallback", {
              listenCount: formatDemoCount(snapshot.totalListens, locale),
            });

    const influences =
      snapshot.topGenre && snapshot.secondGenre
        ? t("publicDemoTeaser.influences", {
            genre1: snapshot.topGenre.name,
            genre2: snapshot.secondGenre.name,
          })
        : snapshot.topGenre
          ? t("publicDemoTeaser.influencesSingle", { genre: snapshot.topGenre.name })
          : undefined;

    const uniqueAspect =
      snapshot.peakDay && snapshot.peakHour
        ? t("publicDemoTeaser.uniqueAspect", {
            peakDay: snapshot.peakDay.dayName,
            peakHour: snapshot.peakHour.hourLabel,
          })
        : snapshot.peakDay
          ? t("publicDemoTeaser.uniqueAspectDayOnly", {
              peakDay: snapshot.peakDay.dayName,
            })
          : snapshot.peakHour
            ? t("publicDemoTeaser.uniqueAspectHourOnly", {
                peakHour: snapshot.peakHour.hourLabel,
              })
            : t("publicDemoTeaser.uniqueAspectFallback", {
                artistCount: formatDemoCount(snapshot.uniqueArtists, locale),
                trackCount: formatDemoCount(snapshot.uniqueTracks, locale),
              });

    return { headline, influences, uniqueAspect };
  }, [snapshot, t, locale]);
}

export function useAiInsightsDemoCopy(snapshot: PublicDemoSoundprintSnapshot | null): string[] {
  const t = useTranslations("ai-insights");
  const locale = useLocale();

  return useMemo(() => {
    if (!snapshot) return [];

    const insights: string[] = [];

    if (snapshot.topGenre) {
      insights.push(
        t("publicDemoTeaser.insightTopGenre", {
          genre: snapshot.topGenre.name,
          pct: formatDemoPercentage(snapshot.topGenre.percentage, locale),
        })
      );
    }

    if (snapshot.topArtist) {
      insights.push(
        t("publicDemoTeaser.insightTopArtist", {
          artist: snapshot.topArtist.name,
          count: formatDemoCount(snapshot.topArtist.count, locale),
        })
      );
    }

    if (snapshot.peakDay && snapshot.peakHour) {
      insights.push(
        t("publicDemoTeaser.insightRhythm", {
          peakDay: snapshot.peakDay.dayName,
          peakHour: snapshot.peakHour.hourLabel,
        })
      );
    } else {
      insights.push(
        t("publicDemoTeaser.insightDiversity", {
          artistCount: formatDemoCount(snapshot.uniqueArtists, locale),
          trackCount: formatDemoCount(snapshot.uniqueTracks, locale),
        })
      );
    }

    return insights.slice(0, 3);
  }, [snapshot, t, locale]);
}
