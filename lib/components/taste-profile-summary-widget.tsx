"use client";

import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";

const WIDGET_SHELL_CLASS =
  "relative min-h-[280px] w-full overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gradient-to-br from-white via-[#fbf8ff] to-[#eef7ff] shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0b0d16] dark:ring-white/[0.06]";

const WIDGET_BACKGROUND = (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.13),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(79,144,224,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.12),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(79,144,224,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_48%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-accent-violet/16 blur-3xl dark:bg-accent-violet/14"
      aria-hidden
    />
  </>
);

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
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <section className={WIDGET_SHELL_CLASS}>
        {WIDGET_BACKGROUND}
        <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted dark:text-slate-400">{t("subtitleShort")}</p>
        </div>
        <div className="relative p-6">
          <InteractiveAiGenreBackfillNotice />
        </div>
      </section>
    );
  }

  if (isLoadingOrFetching) {
    return (
      <div
        className={WIDGET_SHELL_CLASS}
        role="status"
        aria-label={t("loading")}
      >
        {WIDGET_BACKGROUND}
        {/* Header skeleton — matches real layout */}
        <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
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
    if (isGroqGenreClassificationBlockingError(error)) {
      return (
        <section className={WIDGET_SHELL_CLASS}>
          {WIDGET_BACKGROUND}
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t("title")}</h2>
            <p className="mt-0.5 text-sm text-muted dark:text-slate-400">{t("subtitleShort")}</p>
          </div>
          <div className="relative p-6">
            <InteractiveAiGenreBackfillNotice force />
          </div>
        </section>
      );
    }
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
    <section className={WIDGET_SHELL_CLASS}>
      {WIDGET_BACKGROUND}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/50 to-transparent dark:via-cyan-200/30" />
      <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet shadow-sm backdrop-blur dark:border-violet-400/18 dark:bg-[#141622] dark:text-violet-100">
              <span
                className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.65)]"
                aria-hidden
              />
              {t("featureBadge")}
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted dark:text-slate-400">
              {t("subtitleShort")}
            </p>
          </div>
          {data.cached ? (
            <p className="w-fit rounded-full border border-accent-cyan/20 bg-white/60 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-[#12141f] dark:text-slate-400">
              {t("cached")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative space-y-6 p-6">
        <p className="max-w-4xl text-lg font-medium leading-8 text-gray-800 dark:text-slate-200">
          {data.description}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: t("influences"),
              body: data.influences,
              number: "01",
              badge: "border-accent-violet/20 bg-accent-violet/10 text-accent-violet dark:text-violet-100",
              dot: "bg-accent-violet",
            },
            {
              title: t("coreGenres"),
              body: data.coreGenres,
              number: "02",
              badge: "border-accent-cyan/20 bg-accent-cyan/10 text-accent-cyan dark:text-cyan-100",
              dot: "bg-accent-cyan",
            },
            {
              title: t("whatMakesYouUnique"),
              body: data.uniqueAspect,
              number: "03",
              badge: "border-accent-emerald/20 bg-accent-emerald/10 text-accent-emerald dark:text-emerald-100",
              dot: "bg-accent-emerald",
            },
          ].map((section) => (
            <article
              key={section.title}
              className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-3xl border border-card-border bg-white/88 p-5 shadow-card backdrop-blur transition-all hover:-translate-y-1 hover:bg-white hover:shadow-card-hover dark:border-white/[0.06] dark:bg-[#0c0e18] dark:hover:bg-[#101521]"
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90 dark:via-white/25"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),transparent_42%)] opacity-80 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)]"
                aria-hidden
              />
              <div className="relative mb-5 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${section.badge}`}
                >
                  {section.number}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${section.dot} shadow-[0_0_18px_currentColor]`}
                  aria-hidden
                />
              </div>
              <h3 className="relative text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
                {section.title}
              </h3>
              <p className="relative mt-3 text-sm leading-7 text-gray-600 dark:text-slate-300">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
