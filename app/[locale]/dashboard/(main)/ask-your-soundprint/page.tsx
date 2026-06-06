"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Bot,
  Brain,
  ChevronDown,
  LayoutDashboard,
  ListTree,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_TABLE,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
} from "@/lib/constants/dashboard-spotlight";
import { ApiError } from "@/lib/api-client";
import { AssistantChatMessageBody } from "@/lib/components/assistant-chat-message-body";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useMusicChat } from "@/lib/hooks/use-music-chat";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useOverviewStats } from "@/lib/hooks/use-listening";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import {
  LATE_NIGHT_PRESET_RECENT_WINDOW_DAYS,
  type MusicChatMessage,
  type MusicChatPresetArgs,
  type MusicChatPresetQuestionId,
} from "@/lib/dto/music-chat";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";

type QuickQuestionId =
  | "top-tracks"
  | "top-artists"
  | "genre-breakdown"
  | "compare-periods"
  | "taste-shift"
  | "yearly-trends"
  | "consistent-artists"
  | "time-of-day"
  | "artist-deep-dive"
  | "track-obsessions";

/** Artists loaded for the deep-dive preset; one is picked at random from this pool. */
const ARTIST_DEEP_DIVE_POOL_LIMIT = 20;

/** Fallback pair when listening bounds are missing (matches previous static copy). */
const COMPARE_PERIODS_FALLBACK_EARLIER = 2021;
const COMPARE_PERIODS_FALLBACK_LATER = 2024;

/** Fallback single year when listening bounds are missing (should be rare once the date range has loaded). */
const LISTEN_HISTORY_YEAR_FALLBACK = 2022;

/** Même shell hero que `/dashboard/timeline` — vibe startup / Vercel */
const ASK_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

function AskSoundprintHero({ isPublicDemoViewer }: { isPublicDemoViewer: boolean }) {
  const t = useTranslations("askSoundprint");
  return (
    <div className={ASK_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("eyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Sparkles className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          {isPublicDemoViewer ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                {t("heroDemoPill")}
              </span>
            </div>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
            <Link
              href="/dashboard/ai-insights"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <Brain className="h-4 w-4" aria-hidden />
              {t("ctaAiInsights")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
                  <span>{t("heroTrust1")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
                  <span>{t("heroTrust2")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
                  <span>{t("heroTrust3")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickRandomCalendarYearFromHistoryBounds(
  startDate: string | undefined,
  endDate: string | undefined
): number | null {
  if (!startDate || !endDate) return null;
  const yStart = Number.parseInt(startDate.slice(0, 4), 10);
  const yEnd = Number.parseInt(endDate.slice(0, 4), 10);
  if (!Number.isFinite(yStart) || !Number.isFinite(yEnd)) return null;
  const lo = Math.min(yStart, yEnd);
  const hi = Math.max(yStart, yEnd);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * Two distinct calendar years for comparison, ordered earlier → later.
 * If the history span is a single calendar year, uses the previous calendar year as the first period.
 */
function pickTwoDistinctCalendarYearsForCompare(
  startDate: string | undefined,
  endDate: string | undefined
): { earlierYear: number; laterYear: number } | null {
  if (!startDate || !endDate) return null;
  const yStart = Number.parseInt(startDate.slice(0, 4), 10);
  const yEnd = Number.parseInt(endDate.slice(0, 4), 10);
  if (!Number.isFinite(yStart) || !Number.isFinite(yEnd)) return null;
  const lo = Math.min(yStart, yEnd);
  const hi = Math.max(yStart, yEnd);

  if (lo === hi) {
    return { earlierYear: lo - 1, laterYear: lo };
  }

  const span = hi - lo + 1;
  let a = lo + Math.floor(Math.random() * span);
  let b = lo + Math.floor(Math.random() * span);
  let guard = 0;
  while (b === a && guard < 48) {
    b = lo + Math.floor(Math.random() * span);
    guard += 1;
  }
  if (b === a) {
    b = a === lo ? hi : lo;
  }
  return { earlierYear: Math.min(a, b), laterYear: Math.max(a, b) };
}

const QUICK_QUESTION_SECTIONS: Array<{
  titleKey: "core" | "maestroUpgrade";
  examples: Array<{
    id: QuickQuestionId;
    presetQuestionId: MusicChatPresetQuestionId;
  }>;
}> = [
  {
    titleKey: "core",
    examples: [
      { id: "artist-deep-dive", presetQuestionId: "artist-deep-dive" },
      { id: "top-tracks", presetQuestionId: "summer-2022-top-tracks" },
      { id: "top-artists", presetQuestionId: "summer-2022-top-artists" },
      { id: "genre-breakdown", presetQuestionId: "genre-breakdown-last-year" },
      { id: "compare-periods", presetQuestionId: "compare-listening-periods" },
      { id: "yearly-trends", presetQuestionId: "yearly-listening-trends" },
      { id: "consistent-artists", presetQuestionId: "consistent-artists" },
      { id: "time-of-day", presetQuestionId: "late-night-habits" },
    ],
  },
  {
    titleKey: "maestroUpgrade",
    examples: [
      { id: "taste-shift", presetQuestionId: "taste-shift-2020-2024" },
      { id: "track-obsessions", presetQuestionId: "track-obsessions-2022" },
    ],
  },
];

/** Presets surfaced first on mobile — personalized + high-signal analytics pulls. */
const MOBILE_FEATURED_PRESET_IDS: QuickQuestionId[] = [
  "artist-deep-dive",
  "top-tracks",
  "genre-breakdown",
  "compare-periods",
  "time-of-day",
];

type PresetExample = (typeof QUICK_QUESTION_SECTIONS)[number]["examples"][number];

type PresetDisplayContext = {
  deepDiveArtistName: string | null;
  topTracksQuestionYear: number;
  topArtistsQuestionYear: number;
  comparePeriodsEarlierYear: number;
  comparePeriodsLaterYear: number;
  trackObsessionsQuestionYear: number;
};

function usePresetExampleContent(
  example: PresetExample,
  ctx: PresetDisplayContext
): { label: ReactNode; question: string; hint?: string } {
  const t = useTranslations("askSoundprint");

  const label =
    example.id === "artist-deep-dive"
      ? t.rich("examples.artist-deep-dive.labelRich", {
          em: (chunks) => (
            <em className="font-semibold italic text-violet-800 dark:text-violet-100">{chunks}</em>
          ),
        })
      : t(`examples.${example.id}.label`);

  let question: string;
  if (example.id === "artist-deep-dive") {
    question = ctx.deepDiveArtistName
      ? t("artistDeepDiveQuestion", { artist: ctx.deepDiveArtistName })
      : t("examples.artist-deep-dive.question");
  } else if (example.id === "top-tracks") {
    question = t("topTracksYearQuestion", { year: ctx.topTracksQuestionYear });
  } else if (example.id === "top-artists") {
    question = t("topArtistsYearQuestion", { year: ctx.topArtistsQuestionYear });
  } else if (example.id === "compare-periods") {
    question = t("comparePeriodsQuestion", {
      earlierYear: ctx.comparePeriodsEarlierYear,
      laterYear: ctx.comparePeriodsLaterYear,
    });
  } else if (example.id === "track-obsessions") {
    question = t("trackObsessionsYearQuestion", {
      year: ctx.trackObsessionsQuestionYear,
    });
  } else {
    question = t(`examples.${example.id}.question`);
  }

  const hint =
    example.id === "time-of-day"
      ? t("examples.time-of-day.recentWindowHint", {
          days: LATE_NIGHT_PRESET_RECENT_WINDOW_DAYS,
        })
      : undefined;

  return { label, question, hint };
}

function PresetExampleButton({
  example,
  ctx,
  disabled,
  onSelect,
  variant = "full",
}: {
  example: PresetExample;
  ctx: PresetDisplayContext;
  disabled: boolean;
  onSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
  variant?: "full" | "chip";
}) {
  const t = useTranslations("askSoundprint");
  const { label, question, hint } = usePresetExampleContent(example, ctx);

  if (variant === "chip") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(example.presetQuestionId)}
        className="inline-flex min-h-11 shrink-0 snap-start flex-col items-start justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/80"
      >
        <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
          {example.id === "artist-deep-dive" ? label : t(`examples.${example.id}.label`)}
        </span>
        <span className="mt-1 line-clamp-2 max-w-[12.5rem] text-sm font-medium leading-snug text-slate-900 dark:text-white">
          {question}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(example.presetQuestionId)}
      className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition hover:border-cyan-300/50 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:hover:border-cyan-400/35 dark:hover:bg-white/[0.04]"
    >
      <span
        className={
          example.id === "artist-deep-dive"
            ? "block text-[0.68rem] font-semibold tracking-[0.14em] text-violet-700 dark:text-violet-200"
            : "block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200"
        }
      >
        {label}
      </span>
      <span className="mt-1 block text-sm font-medium leading-snug text-slate-900 dark:text-white">
        {question}
      </span>
      {hint ? (
        <span className="mt-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function PresetPlaybookSections({
  ctx,
  disabled,
  onSelect,
  variant = "full",
  filterIds,
}: {
  ctx: PresetDisplayContext;
  disabled: boolean;
  onSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
  variant?: "full" | "chip";
  filterIds?: QuickQuestionId[];
}) {
  const t = useTranslations("askSoundprint");

  return (
    <>
      {QUICK_QUESTION_SECTIONS.map((section) => {
        const examples = filterIds
          ? section.examples.filter((example) => filterIds.includes(example.id))
          : section.examples;
        if (examples.length === 0) return null;

        return (
          <div key={section.titleKey} className="space-y-3">
            {variant === "full" ? (
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t(`presetSections.${section.titleKey}`)}
              </p>
            ) : null}
            {examples.map((example) => (
              <PresetExampleButton
                key={example.id}
                example={example}
                ctx={ctx}
                disabled={disabled}
                onSelect={onSelect}
                variant={variant}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function MusicChatMessages({
  messages,
  thinkingStepIndex,
  thinkingSteps,
  isPending,
}: {
  messages: MusicChatMessage[];
  thinkingStepIndex: number;
  thinkingSteps: string[];
  isPending: boolean;
}) {
  const t = useTranslations("askSoundprint");

  return (
    <>
      {messages.map((message, index) => {
        const isAssistant = message.role === "assistant";
        return (
          <div
            key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
            className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}
          >
            {isAssistant ? (
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
                <Bot className="h-5 w-5 shrink-0" aria-hidden />
              </div>
            ) : null}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isAssistant
                  ? "border border-slate-200/90 bg-white text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
                  : "whitespace-pre-wrap bg-slate-950 text-white shadow-lg shadow-slate-950/25 dark:bg-white dark:text-slate-950"
              }`}
            >
              {isAssistant ? (
                <AssistantChatMessageBody content={message.content} />
              ) : (
                message.content
              )}
            </div>
            {!isAssistant ? (
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <UserRound className="h-5 w-5" aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}
      {isPending ? (
        <div className="flex gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 motion-safe:animate-pulse dark:border-white/10 dark:bg-white/10 dark:text-white">
            <Bot className="h-5 w-5 shrink-0" aria-hidden />
          </div>
          <div
            className="max-w-[min(100%,28rem)] space-y-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-slate-950/80"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="font-medium leading-snug text-slate-900 transition-all duration-300 dark:text-white">
              {thinkingSteps[thinkingStepIndex % thinkingSteps.length]}
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t("thinkingPatience")}
            </p>
            <div
              className="relative h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              aria-hidden
            >
              <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-violet-500/80 to-cyan-500/70 motion-safe:animate-onboarding-import-indeterminate dark:from-violet-400/90 dark:to-cyan-400/75" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MusicChatInputForm({
  input,
  onInputChange,
  onSubmit,
  disabled,
  placeholder,
  layout = "desktop",
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  placeholder: string;
  layout?: "desktop" | "mobile";
}) {
  const t = useTranslations("askSoundprint");
  const isMobile = layout === "mobile";

  return (
    <form
      onSubmit={onSubmit}
      className={isMobile ? "flex items-end gap-2" : "flex flex-col gap-3 sm:flex-row"}
    >
      <label className="sr-only" htmlFor={isMobile ? "ask-soundprint-input-mobile" : "ask-soundprint-input"}>
        {t("inputLabel")}
      </label>
      <textarea
        id={isMobile ? "ask-soundprint-input-mobile" : "ask-soundprint-input"}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={isMobile ? 1 : 2}
        className={
          isMobile
            ? "min-h-11 max-h-28 flex-1 resize-none rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500"
            : "min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500"
        }
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className={
          isMobile
            ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
            : "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:shadow-black/25 dark:hover:bg-slate-100"
        }
        aria-label={t("send")}
      >
        <Send className="h-4 w-4" aria-hidden />
        {!isMobile ? t("send") : null}
      </button>
    </form>
  );
}

function AskSoundprintMobileSkeleton() {
  return (
    <section className="space-y-4 pb-32 lg:hidden" aria-busy="true">
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="mb-4 h-6 w-28 animate-pulse rounded-full bg-white/15" />
        <div className="mb-3 h-8 w-4/5 animate-pulse rounded-xl bg-white/15" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
      </div>
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
        </div>
      </div>
    </section>
  );
}

function AskSoundprintMobileExperience({
  isPublicDemoViewer,
  showGenreBackfillNotice,
  genreClassify423Notice,
  interactiveAiBlockedByGenreBackfill,
  visibleMessages,
  thinkingStepIndex,
  thinkingSteps,
  isPending,
  errorMessage,
  input,
  onInputChange,
  onSubmit,
  freeTextDisabled,
  inputPlaceholder,
  presetCtx,
  presetsDisabled,
  onPresetSelect,
  hasUserMessages,
}: {
  isPublicDemoViewer: boolean;
  showGenreBackfillNotice: boolean;
  genreClassify423Notice: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  visibleMessages: MusicChatMessage[];
  thinkingStepIndex: number;
  thinkingSteps: string[];
  isPending: boolean;
  errorMessage: string | null;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  freeTextDisabled: boolean;
  inputPlaceholder: string;
  presetCtx: PresetDisplayContext;
  presetsDisabled: boolean;
  onPresetSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
  hasUserMessages: boolean;
}) {
  const t = useTranslations("askSoundprint");
  const [presetSheetOpen, setPresetSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const featuredExamples = useMemo(
    () =>
      QUICK_QUESTION_SECTIONS.flatMap((section) => section.examples).filter((example) =>
        MOBILE_FEATURED_PRESET_IDS.includes(example.id)
      ),
    []
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, isPending]);

  return (
    <>
      <section
        className="space-y-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-labelledby="ask-soundprint-mobile-title"
      >
        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_32%)]" />
          <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
                {t("mobile.eyebrow")}
              </span>
              {isPublicDemoViewer ? (
                <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  {t("mobile.demoBadge")}
                </span>
              ) : null}
            </div>
            <h1
              id="ask-soundprint-mobile-title"
              className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-balance"
            >
              {t("mobile.storyTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70">{t("mobile.storyBody")}</p>
          </div>
        </div>

        {showGenreBackfillNotice ? (
          <InteractiveAiGenreBackfillNotice
            force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
          />
        ) : null}

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
          <div className="space-y-4">
            <MusicChatMessages
              messages={visibleMessages}
              thinkingStepIndex={thinkingStepIndex}
              thinkingSteps={thinkingSteps}
              isPending={isPending}
            />
            <div ref={messagesEndRef} aria-hidden />
          </div>
        </div>

        {!hasUserMessages ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
                  {t("mobile.featuredPresets")}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t("mobile.featuredPresetsHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
              >
                <ListTree className="h-4 w-4" aria-hidden />
                {t("mobile.browseAllPresets")}
              </button>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featuredExamples.map((example) => (
                <PresetExampleButton
                  key={example.id}
                  example={example}
                  ctx={presetCtx}
                  disabled={presetsDisabled}
                  onSelect={(presetQuestionId) => {
                    onPresetSelect(presetQuestionId);
                    setPresetSheetOpen(false);
                  }}
                  variant="chip"
                />
              ))}
            </div>
          </div>
        ) : null}

        <details className="group rounded-[1.5rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                {t("mobile.guardrailsTitle")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("mobile.trustSummary")}</p>
            </div>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="space-y-3 border-t border-slate-200/80 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-400">
            <p>{t("guardrailHint")}</p>
            <details className="group/nested">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-white">
                {t("unsupportedTitle")}
              </summary>
              <p className="mt-2">{t("unsupportedExamples")}</p>
            </details>
            <p className="rounded-xl border border-cyan-200/70 bg-cyan-50/90 px-3 py-2 text-xs leading-relaxed text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-950/35 dark:text-cyan-50">
              {t("customizeHint")}
            </p>
          </div>
        </details>
      </section>

      <div
        className="fixed inset-x-0 z-10 border-t border-card-border bg-surface-glass/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          bottom: "calc(4.25rem + env(safe-area-inset-bottom))",
        }}
      >
        {errorMessage ? (
          <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        {hasUserMessages ? (
          <button
            type="button"
            onClick={() => setPresetSheetOpen(true)}
            disabled={presetsDisabled}
            className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          >
            <ListTree className="h-4 w-4" aria-hidden />
            {t("mobile.browseAllPresets")}
          </button>
        ) : null}
        <MusicChatInputForm
          input={input}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          disabled={freeTextDisabled}
          placeholder={inputPlaceholder}
          layout="mobile"
        />
      </div>

      <MobileBottomSheet
        open={presetSheetOpen}
        onClose={() => setPresetSheetOpen(false)}
        ariaLabelledBy="ask-soundprint-preset-sheet-title"
        insetAboveBottomNav
      >
        <div className="px-4 pb-4 pt-1">
          <h2
            id="ask-soundprint-preset-sheet-title"
            className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
          >
            {t("mobile.presetSheetTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("mobile.presetSheetHint")}</p>
          <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-300/25 dark:bg-amber-950/35 dark:text-amber-50">
            {t("heavyPresetHistoryNotice")}
          </p>
          <div className="mt-4 space-y-5">
            <PresetPlaybookSections
              ctx={presetCtx}
              disabled={presetsDisabled}
              onSelect={(presetQuestionId) => {
                onPresetSelect(presetQuestionId);
                setPresetSheetOpen(false);
              }}
            />
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
}

function MusicChatFallback() {
  return (
    <>
      <AskSoundprintMobileSkeleton />
      <div className="mx-auto hidden max-w-6xl space-y-8 lg:block">
        <div
          className="h-52 animate-pulse rounded-[2rem] border border-white/10 bg-gray-950 shadow-2xl shadow-violet-500/10 sm:h-60"
          aria-busy="true"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={`relative min-h-[420px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-busy="true">
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          </div>
          <div className={`relative min-h-[320px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-busy="true">
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
          </div>
        </div>
      </div>
    </>
  );
}

function formatError(
  error: unknown,
  messages: { generic: string; timeout: string }
): string {
  if (error instanceof ApiError && isGroqGenreClassificationBlockingError(error)) {
    return "";
  }
  if (error instanceof ApiError && error.code === "TIMEOUT") {
    return messages.timeout;
  }
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return messages.generic;
}

function MusicChatContent() {
  const t = useTranslations("askSoundprint");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const musicChat = useMusicChat();
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();
  const {
    startDate,
    endDate,
    isAll,
    isLoading: isDateRangeLoading,
  } = useListenDateRange();
  const { data: lifetimeOverview, isLoading: isLifetimeOverviewLoading } = useOverviewStats(
    undefined,
    undefined,
    userId,
    { enabled: !isPublicDemoViewer }
  );
  const disableQuickQuestionsNoListeningData =
    !isPublicDemoViewer &&
    (isDateRangeLoading ||
      isLifetimeOverviewLoading ||
      !startDate ||
      !endDate ||
      (lifetimeOverview?.totalListens ?? 0) < 1);
  const showNoListeningDataPlaceholder =
    disableQuickQuestionsNoListeningData &&
    !isDateRangeLoading &&
    !isLifetimeOverviewLoading;
  const freeTextDisabled =
    musicChat.isPending ||
    isPublicDemoViewer ||
    interactiveAiBlockedByGenreBackfill ||
    disableQuickQuestionsNoListeningData;
  const topArtistStats = useArtistStats(
    startDate,
    endDate,
    userId,
    ARTIST_DEEP_DIVE_POOL_LIMIT,
    0,
    {
      enabled:
        !isPublicDemoViewer && Boolean(startDate && endDate && !isDateRangeLoading),
    }
  );
  const deepDiveTopArtistIdsKey = useMemo(() => {
    const list =
      topArtistStats.data?.topArtists?.slice(0, ARTIST_DEEP_DIVE_POOL_LIMIT) ?? [];
    return list.map((a) => a.artistId).join("|");
  }, [topArtistStats.data]);

  const deepDiveArtistName = useMemo(() => {
    if (isPublicDemoViewer) return null;
    const pool =
      topArtistStats.data?.topArtists?.slice(0, ARTIST_DEEP_DIVE_POOL_LIMIT) ?? [];
    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx]?.artistName?.trim() || null;
  }, [isPublicDemoViewer, deepDiveTopArtistIdsKey]);

  const listenHistoryYearBoundsKey = useMemo(
    () => `${startDate ?? ""}|${endDate ?? ""}`,
    [startDate, endDate]
  );

  const topTracksRandomYear = useMemo(
    () => pickRandomCalendarYearFromHistoryBounds(startDate, endDate),
    [listenHistoryYearBoundsKey]
  );

  /** Separate draw so Top tracks and Top artists are not tied to the same random year. */
  const topArtistsRandomYear = useMemo(
    () => pickRandomCalendarYearFromHistoryBounds(startDate, endDate),
    [listenHistoryYearBoundsKey]
  );

  const topTracksQuestionYear =
    topTracksRandomYear ?? LISTEN_HISTORY_YEAR_FALLBACK;

  const topArtistsQuestionYear =
    topArtistsRandomYear ?? LISTEN_HISTORY_YEAR_FALLBACK;

  const comparePeriodsYears = useMemo(
    () => pickTwoDistinctCalendarYearsForCompare(startDate, endDate),
    [listenHistoryYearBoundsKey]
  );

  const comparePeriodsEarlierYear =
    comparePeriodsYears?.earlierYear ?? COMPARE_PERIODS_FALLBACK_EARLIER;
  const comparePeriodsLaterYear =
    comparePeriodsYears?.laterYear ?? COMPARE_PERIODS_FALLBACK_LATER;

  const trackObsessionsRandomYear = useMemo(
    () => pickRandomCalendarYearFromHistoryBounds(startDate, endDate),
    [listenHistoryYearBoundsKey]
  );

  const trackObsessionsQuestionYear =
    trackObsessionsRandomYear ?? LISTEN_HISTORY_YEAR_FALLBACK;

  const personalizedPlaceholder = useMemo(() => {
    if (!deepDiveArtistName) return null;
    return t("inputPlaceholderWithArtist", { artist: deepDiveArtistName });
  }, [deepDiveArtistName, t]);
  const [messages, setMessages] = useState<MusicChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [genreClassify423Notice, setGenreClassify423Notice] = useState(false);
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);

  useEffect(() => {
    if (!interactiveAiBlockedByGenreBackfill) {
      setGenreClassify423Notice(false);
    }
  }, [interactiveAiBlockedByGenreBackfill]);

  const thinkingSteps = useMemo(
    () => [
      t("thinkingStep0"),
      t("thinkingStep1"),
      t("thinkingStep2"),
      t("thinkingStep3"),
      t("thinkingStep4"),
    ],
    [t]
  );

  useEffect(() => {
    if (!musicChat.isPending) {
      setThinkingStepIndex(0);
      return;
    }
    setThinkingStepIndex(0);
    const intervalId = window.setInterval(() => {
      setThinkingStepIndex((prev) => (prev + 1) % thinkingSteps.length);
    }, 4200);
    return () => window.clearInterval(intervalId);
  }, [musicChat.isPending, thinkingSteps.length]);

  const visibleMessages = useMemo(
    () =>
      messages.length > 0
        ? messages
        : [
            {
              role: "assistant" as const,
              content: isPublicDemoViewer
                ? t("publicDemoIntro")
                : t("emptyAssistantMessage"),
            },
          ],
    [isPublicDemoViewer, messages, t]
  );

  async function sendMessage(
    content: string,
    presetQuestionId?: MusicChatPresetQuestionId,
    presetArgs?: MusicChatPresetArgs
  ) {
    const trimmed = content.trim();
    if (!trimmed && !presetQuestionId) return;
    if (interactiveAiBlockedByGenreBackfill) return;
    setErrorMessage(null);

    const nextMessages: MusicChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");

    try {
      const response = await musicChat.mutateAsync({
        messages: nextMessages,
        locale,
        userId,
        presetQuestionId,
        presetArgs,
        dateRange: {
          startDate,
          endDate,
          isAll,
        },
      });

      if (response.aiUnavailable) {
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content:
              response.aiUnavailableReason === "client"
                ? t("aiDisabledClient")
                : t("aiDisabledEnv"),
          },
        ]);
        return;
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.answer },
      ]);
    } catch (error) {
      if (error instanceof ApiError && isGroqGenreClassificationBlockingError(error)) {
        setErrorMessage(null);
        setGenreClassify423Notice(true);
        setMessages(messages);
        setInput(trimmed);
        return;
      }
      setErrorMessage(formatError(error, {
        generic: t("genericError"),
        timeout: t("requestTimeoutError"),
      }));
      setMessages(messages);
      setInput(trimmed);
    }
  }

  function handlePresetClick(presetQuestionId: MusicChatPresetQuestionId) {
    if (presetQuestionId === "compare-listening-periods") {
      sendMessage(
        t("comparePeriodsQuestion", {
          earlierYear: comparePeriodsEarlierYear,
          laterYear: comparePeriodsLaterYear,
        }),
        presetQuestionId,
        {
          earlierYear: comparePeriodsEarlierYear,
          laterYear: comparePeriodsLaterYear,
        }
      );
      return;
    }
    if (presetQuestionId === "genre-breakdown-last-year") {
      const yEnd =
        endDate && endDate.length >= 4
          ? Number.parseInt(endDate.slice(0, 4), 10)
          : new Date().getUTCFullYear();
      const genreYear = (Number.isFinite(yEnd) ? yEnd : new Date().getUTCFullYear()) - 1;
      sendMessage(
        t("examples.genre-breakdown.question"),
        presetQuestionId,
        { genreYear }
      );
      return;
    }
    if (presetQuestionId === "yearly-listening-trends") {
      sendMessage(t("examples.yearly-trends.question"), presetQuestionId);
      return;
    }
    if (presetQuestionId === "artist-deep-dive") {
      sendMessage(
        deepDiveArtistName
          ? t("artistDeepDiveQuestion", { artist: deepDiveArtistName })
          : t("presets.artist-deep-dive"),
        presetQuestionId,
        deepDiveArtistName ? { artistName: deepDiveArtistName } : undefined
      );
      return;
    }
    if (presetQuestionId === "summer-2022-top-artists") {
      sendMessage(
        t("topArtistsYearQuestion", { year: topArtistsQuestionYear }),
        presetQuestionId
      );
      return;
    }
    if (presetQuestionId === "summer-2022-top-tracks") {
      sendMessage(
        t("topTracksYearQuestion", { year: topTracksQuestionYear }),
        presetQuestionId
      );
      return;
    }
    if (presetQuestionId === "track-obsessions-2022") {
      sendMessage(
        t("trackObsessionsYearQuestion", {
          year: trackObsessionsQuestionYear,
        }),
        presetQuestionId
      );
      return;
    }
    sendMessage(t(`presets.${presetQuestionId}`), presetQuestionId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (interactiveAiBlockedByGenreBackfill) return;
    if (isPublicDemoViewer) {
      setErrorMessage(t("publicDemoFreeTextBlocked"));
      return;
    }
    if (disableQuickQuestionsNoListeningData) return;
    sendMessage(input);
  }

  const presetCtx: PresetDisplayContext = {
    deepDiveArtistName,
    topTracksQuestionYear,
    topArtistsQuestionYear,
    comparePeriodsEarlierYear,
    comparePeriodsLaterYear,
    trackObsessionsQuestionYear,
  };
  const presetsDisabled =
    musicChat.isPending ||
    interactiveAiBlockedByGenreBackfill ||
    disableQuickQuestionsNoListeningData;
  const inputPlaceholder = isPublicDemoViewer
    ? t("publicDemoPlaceholder")
    : showNoListeningDataPlaceholder
      ? t("noListeningDataPlaceholder")
      : (personalizedPlaceholder ?? t("inputPlaceholder"));
  const hasUserMessages = messages.some((message) => message.role === "user");
  const showGenreBackfillNotice =
    !isPublicDemoViewer &&
    (interactiveAiBlockedByGenreBackfill || genreClassify423Notice);

  return (
    <>
      <AskSoundprintMobileExperience
        isPublicDemoViewer={isPublicDemoViewer}
        showGenreBackfillNotice={showGenreBackfillNotice}
        genreClassify423Notice={genreClassify423Notice}
        interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
        visibleMessages={visibleMessages}
        thinkingStepIndex={thinkingStepIndex}
        thinkingSteps={thinkingSteps}
        isPending={musicChat.isPending}
        errorMessage={errorMessage}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        freeTextDisabled={freeTextDisabled}
        inputPlaceholder={inputPlaceholder}
        presetCtx={presetCtx}
        presetsDisabled={presetsDisabled}
        onPresetSelect={handlePresetClick}
        hasUserMessages={hasUserMessages}
      />

      <div className="mx-auto hidden max-w-6xl space-y-8 lg:block">
      <section aria-labelledby="ask-soundprint-heading">
        <h2 id="ask-soundprint-heading" className="sr-only">
          {t("title")}
        </h2>
        <AskSoundprintHero isPublicDemoViewer={isPublicDemoViewer} />
        {isPublicDemoViewer ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">{t("publicDemoMode")}</p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {showGenreBackfillNotice ? (
          <div className="lg:col-span-2">
            <InteractiveAiGenreBackfillNotice
              force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
            />
          </div>
        ) : null}
        <div className={`relative flex flex-col ${DASHBOARD_SPOTLIGHT_SHELL}`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} mx-4 mt-4 max-h-[min(50dvh,360px)] min-h-[280px] flex-1 space-y-4 overflow-y-auto sm:mx-5 sm:mt-5 lg:max-h-[560px] lg:min-h-[420px]`}>
              <MusicChatMessages
                messages={visibleMessages}
                thinkingStepIndex={thinkingStepIndex}
                thinkingSteps={thinkingSteps}
                isPending={musicChat.isPending}
              />
            </div>

            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-4 py-4 sm:px-6 sm:py-5`}>
              {errorMessage ? (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {errorMessage}
                </p>
              ) : null}
              <MusicChatInputForm
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                disabled={freeTextDisabled}
                placeholder={inputPlaceholder}
                layout="desktop"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
            <div className="relative space-y-4 p-4 sm:p-5">
              <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("presetTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("presetDescription")}</p>
              <p className="rounded-xl border border-cyan-200/70 bg-cyan-50/90 px-3 py-2 text-xs leading-relaxed text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-950/35 dark:text-cyan-50">
                {t("customizeHint")}
              </p>
              <p className="rounded-xl border border-amber-200/70 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-300/25 dark:bg-amber-950/35 dark:text-amber-50">
                {t("heavyPresetHistoryNotice")}
              </p>
              <details open className="group mt-1">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.09]">
                  <span>{t("supportedGuideTitle")}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-400"
                    aria-hidden
                  />
                </summary>
                <div className="mt-4 space-y-5">
                  <PresetPlaybookSections
                    ctx={presetCtx}
                    disabled={presetsDisabled}
                    onSelect={handlePresetClick}
                  />
                </div>
              </details>
            </div>
          </div>
          <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
            <div className="relative p-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:p-5">
              {t("guardrailHint")}
              <details className="group mt-3">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-white">
                  {t("unsupportedTitle")}
                </summary>
                <p className="mt-2">{t("unsupportedExamples")}</p>
              </details>
            </div>
          </div>
        </aside>
      </section>
      </div>
    </>
  );
}

export default function AskYourSoundprintPage() {
  return (
    <Suspense fallback={<MusicChatFallback />}>
      <MusicChatContent />
    </Suspense>
  );
}
