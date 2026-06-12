"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { parseCoreGenres } from "@/lib/utils/parse-core-genres";
import {
  CinematicFilmGrain,
  CinematicFloatingOrbs,
  CinematicLightSweep,
  CinematicQuote,
} from "@/lib/components/musical-profile-cinematic";

const WIDGET_SHELL_CLASS =
  "relative min-h-[280px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/30";

const GENRE_PILL_STYLES = [
  "border-violet-400/35 bg-violet-500/15 text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.15)]",
  "border-cyan-400/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  "border-rose-400/35 bg-rose-500/15 text-rose-100 shadow-[0_0_24px_rgba(244,114,182,0.12)]",
  "border-emerald-400/35 bg-emerald-500/15 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.12)]",
  "border-amber-400/35 bg-amber-500/15 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]",
  "border-indigo-400/35 bg-indigo-500/15 text-indigo-100 shadow-[0_0_24px_rgba(129,140,248,0.12)]",
] as const;

const ORB_COLORS = ["#a78bfa", "#67e8f9", "#f472b6", "#34d399", "#fbbf24", "#818cf8"] as const;

function TasteProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <section className={WIDGET_SHELL_CLASS}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.22),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(79,144,224,0.2),transparent_34%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]"
        aria-hidden
      />
      <CinematicFloatingOrbs />
      <CinematicFilmGrain />
      <CinematicLightSweep />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
      <div className="relative">{children}</div>
    </section>
  );
}

function SoundprintOrb({ genreCount }: { genreCount: number }) {
  const segments = Math.max(genreCount, 3);
  const gradient = ORB_COLORS
    .slice(0, segments)
    .map((color, index) => `${color} ${(index / segments) * 360}deg ${((index + 1) / segments) * 360}deg`)
    .join(", ");

  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
      <motion.div
        className="absolute inset-0 rounded-full opacity-90"
        style={{ background: `conic-gradient(from 0deg, ${gradient})` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />
      <div className="absolute inset-[10%] rounded-full bg-slate-950/85 shadow-inner shadow-black/40 backdrop-blur-md" />
      <div
        className="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_55%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-1 text-center">
        <Sparkles className="h-8 w-8 text-cyan-100/90 sm:h-9 sm:w-9" aria-hidden />
        <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
          AI
        </span>
      </div>
    </div>
  );
}

function GenrePills({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre, index) => (
        <motion.span
          key={genre}
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold backdrop-blur ${GENRE_PILL_STYLES[index % GENRE_PILL_STYLES.length]}`}
        >
          {genre}
        </motion.span>
      ))}
    </div>
  );
}

function TasteProfileLoadingState() {
  const t = useTranslations("taste-profile");

  return (
    <TasteProfileShell>
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:p-10">
        <div className="space-y-5">
          <div className="h-7 w-28 animate-shimmer rounded-full bg-white/10" />
          <div className="space-y-3">
            <div className="h-8 w-full animate-shimmer rounded-lg bg-white/10" />
            <div className="h-8 w-[92%] animate-shimmer rounded-lg bg-white/10" />
            <div className="h-8 w-[78%] animate-shimmer rounded-lg bg-white/10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-24 animate-shimmer rounded-full bg-white/10" />
            ))}
          </div>
          <p className="text-xs text-slate-400">{t("loading")}</p>
        </div>
        <div className="flex justify-center">
          <div className="h-44 w-44 animate-pulse rounded-full bg-white/10 sm:h-52 sm:w-52" />
        </div>
      </div>
    </TasteProfileShell>
  );
}

function TasteProfileBlockedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const tOverview = useTranslations("overview");

  return (
    <TasteProfileShell>
      <div className="border-b border-white/10 px-6 py-5 sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
          {tOverview("sections.snapshot.eyebrow")}
        </p>
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </TasteProfileShell>
  );
}

/**
 * Overview teaser for the AI taste profile — visual-first, minimal text.
 */
export function TasteProfileSummaryWidget() {
  const t = useTranslations("taste-profile");
  const tOverview = useTranslations("overview");
  const searchParams = useSearchParams();
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const profileHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/musical-profile", searchParams),
    [searchParams]
  );

  const { data, isLoading, error } = useTasteProfile(startDate, endDate, "casual", {
    userId: viewerUserId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <TasteProfileBlockedShell>
        <InteractiveAiGenreBackfillNotice />
      </TasteProfileBlockedShell>
    );
  }

  if (isLoadingOrFetching) {
    return (
      <div role="status" aria-label={t("loading")}>
        <TasteProfileLoadingState />
      </div>
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return (
        <TasteProfileBlockedShell>
          <InteractiveAiGenreBackfillNotice force />
        </TasteProfileBlockedShell>
      );
    }
    return (
      <AiWidgetQuotaOrError
        title={tOverview("sections.snapshot.eyebrow")}
        subtitle={t("pullQuoteLabel")}
        error={error}
      />
    );
  }

  if (data?.aiUnavailable) {
    return (
      <AiFeatureDisabledPlaceholder
        title={tOverview("sections.snapshot.eyebrow")}
        subtitle={t("pullQuoteLabel")}
        reason={data.aiUnavailableReason ?? "client"}
      />
    );
  }

  if (!data) {
    return null;
  }

  const genres = parseCoreGenres(data.coreGenres);

  return (
    <TasteProfileShell>
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-10 lg:p-10">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
              {tOverview("sections.snapshot.eyebrow")}
            </div>
            {data.cached ? (
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-500">
                {t("cached")}
              </span>
            ) : null}
          </div>

          <CinematicQuote
            quoteKey={data.description}
            className="mt-6 max-w-2xl text-balance text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl lg:text-[2rem] lg:leading-[1.2]"
          >
            {data.description}
          </CinematicQuote>

          {genres.length > 0 ? (
            <div className="mt-6">
              <GenrePills genres={genres} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={profileHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("exploreProfileCta")}
            </Link>
            <Link
              href={profileHref}
              className="text-sm font-semibold text-slate-400 transition-colors hover:text-white"
            >
              {t("seeMore")}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <SoundprintOrb genreCount={genres.length} />
        </div>
      </div>
    </TasteProfileShell>
  );
}
