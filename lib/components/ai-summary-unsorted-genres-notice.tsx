"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useGenreBackfillJobSafe } from "@/lib/context/genre-backfill-job-context";
import { genreBackfillKeys } from "@/lib/hooks/query-keys";
import { useUnsortedGenreCoverage } from "@/lib/hooks/use-unsorted-genre-coverage";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

type AiSummaryUnsortedGenresNoticeProps = {
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  userId?: string | null;
};

export function AiSummaryUnsortedGenresNotice({
  enabled,
  startDate,
  endDate,
  userId,
}: AiSummaryUnsortedGenresNoticeProps) {
  const t = useTranslations("dashboard.interactiveAi.unsortedCoverage");
  const tConsent = useTranslations("onboarding.genreLlmConsent");
  const queryClient = useQueryClient();
  const jobCtx = useGenreBackfillJobSafe();
  const [isStarting, setIsStarting] = useState(false);
  const { shouldInvite, unknownRatio, groqConfigured } = useUnsortedGenreCoverage({
    enabled,
    startDate,
    endDate,
    userId,
  });

  const startBackfill = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? tConsent("startError"));
        return;
      }
      clearGenreBackfillBannerBlockingPrefs();
      toast.success(tConsent("startedToast"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: genreBackfillKeys.eligibility() }),
        jobCtx?.refreshStatus(),
      ]);
    } catch {
      toast.error(tConsent("startError"));
    } finally {
      setIsStarting(false);
    }
  }, [jobCtx, queryClient, tConsent]);

  if (!shouldInvite) {
    return null;
  }

  const pct = Math.round(unknownRatio);

  return (
    <div
      role="status"
      className="rounded-2xl border border-card-border bg-surface/80 px-4 py-3 text-sm shadow-sm dark:border-white/[0.06] dark:bg-[#0f111a]/80"
    >
      <p className="font-semibold text-foreground">{t("title")}</p>
      <p className="mt-1.5 leading-6 text-muted">{t("body", { pct })}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {groqConfigured ? (
          <button
            type="button"
            disabled={isStarting}
            onClick={() => void startBackfill()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent-violet px-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-violet/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? tConsent("starting") : t("groqCta")}
          </button>
        ) : null}
        <Link
          href="/dashboard/genres/palette"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border bg-surface-raised px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/[0.05] dark:border-white/10 dark:hover:bg-white/[0.06]"
        >
          {t("paletteCta")}
        </Link>
      </div>
    </div>
  );
}
