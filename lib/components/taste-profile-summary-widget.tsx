"use client";

import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";

/**
 * Overview feature widget showing the AI-generated taste profile.
 * Uses full listen range when "all" (tout) filter is selected.
 */
export function TasteProfileSummaryWidget() {
  const t = useTranslations("taste-profile");
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useTasteProfile(startDate, endDate, "casual", {
    userId: viewerUserId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;

  if (isLoadingOrFetching) {
    return (
      <div
        className="relative min-h-[280px] w-full overflow-hidden rounded-2xl border border-accent-violet/25 bg-card-surface shadow-2xl ring-1 ring-accent-violet/10 dark:border-accent-violet/30 dark:ring-accent-violet/20"
        role="status"
        aria-label={t("loading")}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), transparent 34%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.12), transparent 28%)",
          }}
        />
        {/* Header skeleton — matches real layout */}
        <div className="relative border-b border-gray-100/80 px-6 py-5 dark:border-gray-700/50">
          <div className="space-y-1.5">
            <div className="h-5 w-44 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        {/* Content skeleton — paragraph block with staggered lines */}
        <div className="relative p-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t("loading")}</p>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-3.5 animate-shimmer rounded bg-gray-200 dark:bg-gray-700"
                style={{
                  width: i === 5 ? "66%" : "100%",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AiWidgetQuotaOrError
        title={t("title")}
        subtitle={t("subtitleShort")}
        error={error}
      />
    );
  }

  if (data?.aiUnavailable) {
    return (
      <AiFeatureDisabledPlaceholder
        title={t("title")}
        subtitle={t("subtitleShort")}
        reason={data.aiUnavailableReason ?? "client"}
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="relative min-h-[280px] w-full overflow-hidden rounded-2xl border border-accent-violet/25 bg-card-surface shadow-2xl ring-1 ring-accent-violet/10 transition-all duration-300 hover:border-accent-violet/40 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.28)] dark:border-accent-violet/30 dark:ring-accent-violet/20">
      <div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-50"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), transparent 34%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.12), transparent 28%)",
        }}
      />
      <div className="relative border-b border-gray-100/80 px-6 py-5 dark:border-gray-700/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-accent-violet/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-violet dark:bg-accent-violet/15">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-violet" aria-hidden />
              {t("featureBadge")}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("subtitleShort")}
            </p>
          </div>
        </div>
      </div>
      <div className="relative space-y-6 p-6">
        <p className="max-w-4xl text-base leading-8 text-gray-700 dark:text-gray-300">
          {data.description}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: t("influences"), body: data.influences },
            { title: t("coreGenres"), body: data.coreGenres },
            { title: t("whatMakesYouUnique"), body: data.uniqueAspect },
          ].map((section) => (
            <article
              key={section.title}
              className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {section.body}
              </p>
            </article>
          ))}
        </div>
        {data.cached && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("cached")}
          </p>
        )}
      </div>
    </section>
  );
}
