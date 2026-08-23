"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Bot,
  CalendarRange,
  ChevronDown,
  ListTree,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
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
import { getProfileDateRangeParts } from "@/lib/utils/musical-profile-date-range";
import {
  LATE_NIGHT_PRESET_RECENT_WINDOW_DAYS,
  WEEKLY_TASTE_EVOLUTION_PRESET_WINDOW_DAYS,
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
  | "weekly-taste-evolution"
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

const ASK_SOUNDPRINT_DISMISS_CUSTOMIZE_HINT_KEY = "ama-ask-soundprint-dismiss-customize-hint";
const ASK_SOUNDPRINT_DISMISS_HEAVY_PRESET_NOTICE_KEY =
  "ama-ask-soundprint-dismiss-heavy-preset-notice";

const COMPACT_HEADER_SHELL_CLASS =
  "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 px-5 py-5 text-white shadow-xl shadow-violet-500/10 sm:px-6 sm:py-6";

function DismissibleAskHint({
  storageKey,
  variant,
  children,
}: {
  storageKey: string;
  variant: "cyan" | "amber";
  children: ReactNode;
}) {
  const t = useTranslations("askSoundprint");
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // ignore private mode / quota
    }
    setHydrated(true);
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore private mode / quota
    }
  }

  if (!hydrated || dismissed) return null;

  const variantClassName =
    variant === "cyan"
      ? "border-cyan-200/70 bg-cyan-50/90 text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-950/35 dark:text-cyan-50"
      : "border-amber-200/70 bg-amber-50/90 text-amber-950 dark:border-amber-300/25 dark:bg-amber-950/35 dark:text-amber-50";

  return (
    <div
      className={`relative rounded-xl border px-3 py-2 pr-9 text-xs leading-relaxed ${variantClassName}`}
    >
      {children}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-current/55 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 dark:hover:bg-white/10"
        aria-label={t("dismissHintAria")}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

function AskSoundprintPeriodChip({
  startDate,
  endDate,
  isAll,
  locale,
  className = "",
}: {
  startDate?: string;
  endDate?: string;
  isAll: boolean;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("askSoundprint");
  const parts = getProfileDateRangeParts(startDate, endDate, locale, "compact");
  if (!parts) return null;

  return (
    <span
      className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur ${className}`}
    >
      <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {isAll
          ? t("periodChipAll", { range: parts.compactLabel })
          : t("periodChip", { range: parts.compactLabel })}
      </span>
    </span>
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
      { id: "weekly-taste-evolution", presetQuestionId: "weekly-taste-evolution" },
      { id: "taste-shift", presetQuestionId: "taste-shift-2020-2024" },
      { id: "track-obsessions", presetQuestionId: "track-obsessions-2022" },
    ],
  },
];

/** Presets surfaced first — personalized + high-signal analytics pulls. */
const FEATURED_PRESET_IDS: QuickQuestionId[] = [
  "artist-deep-dive",
  "weekly-taste-evolution",
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

function getFeaturedExamples(): PresetExample[] {
  const byId = new Map(
    QUICK_QUESTION_SECTIONS.flatMap((section) => section.examples).map((example) => [
      example.id,
      example,
    ])
  );
  return FEATURED_PRESET_IDS.flatMap((id) => {
    const example = byId.get(id);
    return example ? [example] : [];
  });
}

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
      : example.id === "weekly-taste-evolution"
        ? t("examples.weekly-taste-evolution.recentWindowHint", {
            days: WEEKLY_TASTE_EVOLUTION_PRESET_WINDOW_DAYS,
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
      <div className="inline-flex shrink-0 snap-start flex-col">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(example.presetQuestionId)}
          className="inline-flex min-h-11 flex-col items-start justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/80"
        >
          <span className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
            {example.id === "artist-deep-dive" ? label : t(`examples.${example.id}.label`)}
          </span>
          <span className="mt-1 line-clamp-2 max-w-[12.5rem] text-sm font-medium leading-snug text-slate-900 dark:text-white">
            {question}
          </span>
          {hint ? (
            <span className="mt-1.5 line-clamp-2 max-w-[12.5rem] text-[0.65rem] leading-snug text-slate-500 dark:text-slate-400">
              {hint}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div>
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
    </div>
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

function FeaturedPresetSuggestions({
  ctx,
  disabled,
  onSelect,
  layout,
}: {
  ctx: PresetDisplayContext;
  disabled: boolean;
  onSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
  layout: "desktop" | "mobile";
}) {
  const featuredExamples = useMemo(() => getFeaturedExamples(), []);

  if (layout === "mobile") {
    return (
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {featuredExamples.map((example) => (
          <PresetExampleButton
            key={example.id}
            example={example}
            ctx={ctx}
            disabled={disabled}
            onSelect={onSelect}
            variant="chip"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {featuredExamples.map((example) => (
        <PresetExampleButton
          key={example.id}
          example={example}
          ctx={ctx}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function PlaybookHints() {
  const t = useTranslations("askSoundprint");
  return (
    <div className="space-y-2">
      <DismissibleAskHint storageKey={ASK_SOUNDPRINT_DISMISS_CUSTOMIZE_HINT_KEY} variant="cyan">
        {t("customizeHint")}
      </DismissibleAskHint>
      <DismissibleAskHint storageKey={ASK_SOUNDPRINT_DISMISS_HEAVY_PRESET_NOTICE_KEY} variant="amber">
        {t("heavyPresetHistoryNotice")}
      </DismissibleAskHint>
    </div>
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isMobile) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

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
        onKeyDown={handleKeyDown}
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
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl shadow-violet-500/10">
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
  startDate,
  endDate,
  isAll,
  locale,
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
  startDate?: string;
  endDate?: string;
  isAll: boolean;
  locale: string;
}) {
  const t = useTranslations("askSoundprint");
  const [presetSheetOpen, setPresetSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, isPending]);

  return (
    <>
      <section
        className="space-y-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-labelledby="ask-soundprint-mobile-title"
      >
        {hasUserMessages ? (
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-white shadow-lg shadow-violet-500/10">
            <h1
              id="ask-soundprint-mobile-title"
              className="min-w-0 truncate text-sm font-semibold tracking-tight"
            >
              {t("title")}
            </h1>
            <AskSoundprintPeriodChip
              startDate={startDate}
              endDate={endDate}
              isAll={isAll}
              locale={locale}
              className="shrink-0 border-white/10 bg-white/10 py-0.5 text-[0.65rem]"
            />
          </div>
        ) : (
          <div className={COMPACT_HEADER_SHELL_CLASS}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_32%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
                  <LiveStatusDot />
                  {t("eyebrow")}
                </span>
                {isPublicDemoViewer ? (
                  <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                    {t("heroDemoPill")}
                  </span>
                ) : null}
              </div>
              <h1
                id="ask-soundprint-mobile-title"
                className="mt-4 flex items-center gap-2 text-2xl font-semibold tracking-[-0.05em] text-balance"
              >
                <Sparkles className="h-6 w-6 shrink-0 text-violet-200/90" aria-hidden />
                {t("title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/70">{t("compactTrust")}</p>
              <div className="mt-3">
                <AskSoundprintPeriodChip
                  startDate={startDate}
                  endDate={endDate}
                  isAll={isAll}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        )}

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
                  {t("featuredTitle")}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t("emptyActionHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
              >
                <ListTree className="h-4 w-4" aria-hidden />
                {t("allQuestions")}
              </button>
            </div>
            <FeaturedPresetSuggestions
              ctx={presetCtx}
              disabled={presetsDisabled}
              onSelect={(presetQuestionId) => {
                onPresetSelect(presetQuestionId);
                setPresetSheetOpen(false);
              }}
              layout="mobile"
            />
          </div>
        ) : null}
      </section>

      <div
        className="fixed inset-x-0 z-10 border-t border-card-border bg-surface-glass/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          bottom: "var(--dashboard-bottom-nav-offset, 0px)",
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
            {t("allQuestions")}
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
            {t("allQuestions")}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("allQuestionsHint")}</p>
          <div className="mt-3">
            <PlaybookHints />
          </div>
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
      <div className="mx-auto hidden max-w-6xl space-y-6 lg:block">
        <div
          className="h-28 animate-pulse rounded-[1.75rem] border border-white/10 bg-gray-950 shadow-xl shadow-violet-500/10"
          aria-busy="true"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className={`relative min-h-[420px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-busy="true">
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          </div>
          <div className={`relative min-h-[240px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-busy="true">
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
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const desktopWellRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const well = desktopWellRef.current;
    if (!well) return;
    well.scrollTo({ top: well.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length, musicChat.isPending]);

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
              response.aiUnavailableReason === "consent"
                ? t("aiDisabledConsent")
                : response.aiUnavailableReason === "client"
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
        startDate={startDate}
        endDate={endDate}
        isAll={isAll}
        locale={locale}
      />

      <div className="mx-auto hidden max-w-6xl space-y-6 lg:block">
        <header className={COMPACT_HEADER_SHELL_CLASS}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%)]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
                <LiveStatusDot />
                {t("eyebrow")}
              </div>
              <h1
                id="ask-soundprint-heading"
                className="flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl"
              >
                <Sparkles className="h-7 w-7 shrink-0 text-violet-200/90" aria-hidden />
                <span>{t("title")}</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{t("compactTrust")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPublicDemoViewer ? (
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  {t("heroDemoPill")}
                </span>
              ) : null}
              <AskSoundprintPeriodChip
                startDate={startDate}
                endDate={endDate}
                isAll={isAll}
                locale={locale}
              />
            </div>
          </div>
        </header>

        {isPublicDemoViewer ? (
          <p className="text-center text-sm text-muted-foreground">{t("publicDemoMode")}</p>
        ) : null}

        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
            <div className="relative flex flex-col">
              <div
                ref={desktopWellRef}
                className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} mx-4 mt-4 max-h-[min(72dvh,680px)] min-h-[360px] space-y-4 overflow-y-auto sm:mx-5 sm:mt-5 lg:min-h-[480px]`}
              >
                <MusicChatMessages
                  messages={visibleMessages}
                  thinkingStepIndex={thinkingStepIndex}
                  thinkingSteps={thinkingSteps}
                  isPending={musicChat.isPending}
                />
                {!hasUserMessages ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
                        {t("featuredTitle")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {t("emptyActionHint")}
                      </p>
                    </div>
                    <FeaturedPresetSuggestions
                      ctx={presetCtx}
                      disabled={presetsDisabled}
                      onSelect={handlePresetClick}
                      layout="desktop"
                    />
                  </div>
                ) : null}
              </div>

              <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-4 py-4 sm:px-6 sm:py-5`}>
                {errorMessage ? (
                  <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    {errorMessage}
                  </p>
                ) : null}
                {hasUserMessages ? (
                  <button
                    type="button"
                    onClick={() => setPlaybookOpen(true)}
                    disabled={presetsDisabled}
                    className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-white/[0.04]"
                  >
                    <ListTree className="h-4 w-4" aria-hidden />
                    {t("allQuestions")}
                  </button>
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

          <aside className="space-y-4">
            <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
              <div className="relative space-y-3 p-4 sm:p-5">
                <details
                  className="group"
                  open={playbookOpen}
                  onToggle={(event) => setPlaybookOpen(event.currentTarget.open)}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.09]">
                    <span>{t("allQuestions")}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-400"
                      aria-hidden
                    />
                  </summary>
                  <div className="mt-4 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {t("allQuestionsHint")}
                    </p>
                    <PlaybookHints />
                    <div className="max-h-[min(48dvh,22rem)] space-y-5 overflow-y-auto overscroll-y-contain pr-0.5">
                      <PresetPlaybookSections
                        ctx={presetCtx}
                        disabled={presetsDisabled}
                        onSelect={handlePresetClick}
                      />
                    </div>
                  </div>
                </details>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-white/[0.04]">
                    <span>{t("unsupportedTitle")}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-400"
                      aria-hidden
                    />
                  </summary>
                  <div className="mt-3 space-y-2 px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <p>{t("guardrailHint")}</p>
                    <p>{t("unsupportedExamples")}</p>
                  </div>
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
