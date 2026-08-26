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
  CalendarRange,
  ListTree,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import {
  AskSoundprintChatMessages,
  AskSoundprintComposer,
  AskSoundprintMark,
  AskSoundprintSuggestionTile,
} from "@/lib/components/ask-soundprint-chat";
import {
  AskSoundprintMobileExperience,
  AskSoundprintMobileSkeleton,
  AskSoundprintPresetRow,
} from "@/lib/components/ask-soundprint-mobile";
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

const EMPTY_STATE_PRESET_COUNT = 4;

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
      className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white/90 ${className}`}
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


function AskSoundprintBoundPresetRow({
  example,
  ctx,
  disabled,
  onSelect,
}: {
  example: PresetExample;
  ctx: PresetDisplayContext;
  disabled: boolean;
  onSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
}) {
  const t = useTranslations("askSoundprint");
  const { label, question, hint } = usePresetExampleContent(example, ctx);
  return (
    <AskSoundprintPresetRow
      label={label}
      question={question}
      hint={hint}
      disabled={disabled}
      onSelect={() => onSelect(example.presetQuestionId)}
      ariaLabel={t("mobile.featuredAskAria", { question })}
    />
  );
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
    <AskSoundprintSuggestionTile
      label={label}
      question={question}
      hint={hint}
      disabled={disabled}
      onSelect={() => onSelect(example.presetQuestionId)}
    />
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
              <AskSoundprintBoundPresetRow
                key={example.id}
                example={example}
                ctx={ctx}
                disabled={disabled}
                onSelect={onSelect}
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
}: {
  ctx: PresetDisplayContext;
  disabled: boolean;
  onSelect: (presetQuestionId: MusicChatPresetQuestionId) => void;
}) {
  const featuredExamples = useMemo(
    () => getFeaturedExamples().slice(0, EMPTY_STATE_PRESET_COUNT),
    []
  );

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
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

function MusicChatFallback() {
  return (
    <>
      <AskSoundprintMobileSkeleton />
      <div className="hidden min-h-[calc(100dvh-var(--dashboard-filter-height,0px))] flex-col lg:flex" aria-busy="true">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-violet-200/70 dark:bg-violet-500/20" />
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200/80 dark:bg-white/10" />
          <div className="h-4 w-48 animate-pulse rounded-lg bg-slate-200/60 dark:bg-white/5" />
        </div>
        <div className="mx-auto mb-6 h-14 w-full max-w-3xl animate-pulse rounded-[1.75rem] bg-slate-200/80 dark:bg-white/10" />
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
  const tCommon = useTranslations("common");
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

  const visibleMessages = messages;

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
    setPlaybookOpen(false);
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
  const featuredExample = useMemo(
    () =>
      QUICK_QUESTION_SECTIONS.flatMap((section) => section.examples).find(
        (example) => example.id === "artist-deep-dive"
      ) ?? null,
    []
  );

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
        presetsDisabled={presetsDisabled}
        hasUserMessages={hasUserMessages}
        startDate={startDate}
        endDate={endDate}
        isAll={isAll}
        locale={locale}
        featuredRow={
          featuredExample ? (
            <AskSoundprintBoundPresetRow
              example={featuredExample}
              ctx={presetCtx}
              disabled={presetsDisabled}
              onSelect={handlePresetClick}
            />
          ) : null
        }
        playbook={
          <>
            {QUICK_QUESTION_SECTIONS.map((section) => (
              <div key={section.titleKey} className="space-y-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t(`presetSections.${section.titleKey}`)}
                </p>
                {section.examples.map((example) => (
                  <AskSoundprintBoundPresetRow
                    key={example.id}
                    example={example}
                    ctx={presetCtx}
                    disabled={presetsDisabled}
                    onSelect={(presetQuestionId) => {
                      handlePresetClick(presetQuestionId);
                    }}
                  />
                ))}
              </div>
            ))}
          </>
        }
        sheetHints={<PlaybookHints />}
      />

      <div className="relative hidden min-h-0 flex-1 flex-col lg:flex">
        <header className="flex shrink-0 items-center justify-between gap-3 px-6 py-3">
          {hasUserMessages ? (
            <h1
              id="ask-soundprint-heading"
              className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              <AskSoundprintMark size="md" />
              <span className="truncate">{t("title")}</span>
            </h1>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {isPublicDemoViewer ? (
              <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/90">
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
        </header>

        {showGenreBackfillNotice ? (
          <div className="px-6 pb-2">
            <InteractiveAiGenreBackfillNotice
              force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
            />
          </div>
        ) : null}

        <div ref={desktopWellRef} className="min-h-0 flex-1 overflow-y-auto px-6">
          {!hasUserMessages && !musicChat.isPending ? (
            <div className="flex min-h-full flex-col items-center justify-center py-10">
              <AskSoundprintMark size="lg" className="mb-6" />
              <h1
                id="ask-soundprint-heading"
                className="text-center text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
              >
                {t("title")}
              </h1>
              <p className="mt-2 text-center text-base text-slate-500 dark:text-slate-400">
                {t("compactTrust")}
              </p>
              {isPublicDemoViewer ? (
                <p className="mt-2 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("publicDemoMode")}
                </p>
              ) : (
                <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("emptyActionHint")}
                </p>
              )}
              <div className="mt-8 w-full max-w-2xl">
                <FeaturedPresetSuggestions
                  ctx={presetCtx}
                  disabled={presetsDisabled}
                  onSelect={handlePresetClick}
                />
              </div>
              <button
                type="button"
                onClick={() => setPlaybookOpen(true)}
                disabled={presetsDisabled}
                className="mt-5 text-sm font-medium text-slate-500 transition hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:text-violet-200"
              >
                {t("allQuestions")}
              </button>
            </div>
          ) : (
            <div className="py-4 pb-8">
              <AskSoundprintChatMessages
                messages={visibleMessages}
                thinkingStepIndex={thinkingStepIndex}
                thinkingSteps={thinkingSteps}
                isPending={musicChat.isPending}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pb-5 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            {errorMessage ? (
              <p className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {errorMessage}
              </p>
            ) : null}
            <AskSoundprintComposer
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              disabled={freeTextDisabled}
              placeholder={inputPlaceholder}
              layout="desktop"
              leadingAction={
                <button
                  type="button"
                  onClick={() => setPlaybookOpen(true)}
                  disabled={presetsDisabled}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-violet-200"
                  aria-label={t("allQuestions")}
                >
                  <ListTree className="h-4 w-4" aria-hidden />
                </button>
              }
            />
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              {t("heroStatTag")}
            </p>
          </div>
        </div>

        {playbookOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
              aria-label={tCommon("close")}
              onClick={() => setPlaybookOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ask-soundprint-playbook-title"
              className="relative z-10 flex max-h-[min(80dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                <div>
                  <h2
                    id="ask-soundprint-playbook-title"
                    className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
                  >
                    {t("allQuestions")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("allQuestionsHint")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaybookOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                  aria-label={tCommon("close")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto px-5 py-4">
                <PlaybookHints />
                <PresetPlaybookSections
                  ctx={presetCtx}
                  disabled={presetsDisabled}
                  onSelect={handlePresetClick}
                />
                <div className="space-y-2 border-t border-slate-200/80 pt-4 text-sm leading-relaxed text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{t("unsupportedTitle")}</p>
                  <p>{t("guardrailHint")}</p>
                  <p>{t("unsupportedExamples")}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
