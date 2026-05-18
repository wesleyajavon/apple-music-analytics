"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/lib/context/notification-center-context";
import {
  GENRE_AI_NUDGE_COOLDOWN_MS,
  GENRE_AI_NUDGE_LAST_PROMPT_STORAGE_KEY,
  GENRE_AI_NUDGE_NOTIFICATION_SOURCE,
} from "@/lib/constants/genre-ai-nudge-notification";
import { useHideNotificationCenterForPublicDemo } from "@/lib/hooks/use-public-demo-viewer";
import { isGroqGenreNudgeEligible } from "@/lib/utils/genre-ai-nudge-eligibility";
import { getGenreBackfillBannerOptOut } from "@/lib/utils/genre-backfill-banner-prefs";

type StatusResponse = {
  ok?: boolean;
  job?: {
    status: string;
  } | null;
  eligibility?: {
    groqConfigured: boolean;
    unknownRatio: number;
    unknownTrackCount: number;
    totalTrackCount: number;
  } | null;
};

/**
 * Notification lorsque la majorité des titres (genre NULL) est encore inconnue et Groq est dispo ;
 * Action lancée depuis le panneau (POST /genre-backfill/start).
 */
export function GenreGroqClassificationNudgeNotifier() {
  const searchParams = useSearchParams();
  const hideForDemo = useHideNotificationCenterForPublicDemo(searchParams.get("userId"));
  const { addNotification, items, hydrated } = useNotifications();
  const t = useTranslations("components.notificationCenter");
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!hydrated || hideForDemo) return;

    let cancelled = false;

    (async () => {
      if (getGenreBackfillBannerOptOut()) return;

      if (
        itemsRef.current.some(
          (n) => !n.read && n.source === GENRE_AI_NUDGE_NOTIFICATION_SOURCE
        )
      ) {
        return;
      }

      try {
        const raw = window.localStorage.getItem(GENRE_AI_NUDGE_LAST_PROMPT_STORAGE_KEY);
        if (raw) {
          const last = Number(raw);
          if (Number.isFinite(last) && Date.now() - last < GENRE_AI_NUDGE_COOLDOWN_MS) return;
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch(
          "/api/user/onboarding/import/genre-backfill/status?includeTerminal=1&includeEligibility=1"
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => ({}))) as StatusResponse;
        if (data.ok !== true) return;

        const eligibility = data.eligibility;
        if (!eligibility || !isGroqGenreNudgeEligible(eligibility)) return;

        const job = data.job;
        const activeStatuses = ["pending", "running", "paused"];
        if (job && activeStatuses.includes(job.status)) return;

        const pct = Math.round(eligibility.unknownRatio);
        const count = eligibility.unknownTrackCount;
        addNotification({
          title: t("genreGroqNudge.title"),
          body: t("genreGroqNudge.body", { pct, count }),
          genreGroqNudge: { pct, count },
          severity: "info",
          source: GENRE_AI_NUDGE_NOTIFICATION_SOURCE,
        });
        try {
          window.localStorage.setItem(GENRE_AI_NUDGE_LAST_PROMPT_STORAGE_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      } catch {
        /* réseau / parse */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, hideForDemo, addNotification, t]);

  return null;
}
