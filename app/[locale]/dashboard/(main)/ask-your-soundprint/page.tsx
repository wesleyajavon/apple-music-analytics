"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bot, ChevronDown, Send, Sparkles, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { AssistantChatMessageBody } from "@/lib/components/assistant-chat-message-body";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useMusicChat } from "@/lib/hooks/use-music-chat";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
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

function MusicChatFallback() {
  return (
    <div className="space-y-6">
      <div className="h-56 animate-pulse rounded-3xl border border-violet-300/20 bg-card-surface" />
      <div className="h-96 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
    </div>
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
    sendMessage(input);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-violet-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.32),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#4c1d95_100%)] px-6 py-8 shadow-2xl shadow-violet-950/40 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(34,211,238,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/85">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <Sparkles className="h-9 w-9 shrink-0 text-violet-200/90" aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className="mt-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-400 opacity-95 shadow-[0_0_24px_rgba(139,92,246,0.35)]"
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-violet-100/90 sm:text-lg">
            {t("subtitle")}
          </p>
          {isPublicDemoViewer ? (
            <p className="mt-3 text-sm text-cyan-100/90">
              {t("publicDemoMode")}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {!isPublicDemoViewer &&
        (interactiveAiBlockedByGenreBackfill || genreClassify423Notice) ? (
          <div className="lg:col-span-2">
            <InteractiveAiGenreBackfillNotice
              force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
            />
          </div>
        ) : null}
        <div className="rounded-2xl border border-card-border bg-card-surface shadow-card">
          <div className="max-h-[560px] min-h-[420px] space-y-4 overflow-y-auto p-4 sm:p-6">
            {visibleMessages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className={`flex gap-3 ${isAssistant ? "" : "justify-end"}`}
                >
                  {isAssistant ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      <Bot className="h-5 w-5 shrink-0" aria-hidden />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? "border border-violet-200/30 bg-white/70 text-foreground dark:bg-slate-950/35"
                        : "whitespace-pre-wrap bg-violet-600 text-white shadow-sm shadow-violet-950/20"
                    }`}
                  >
                    {isAssistant ? (
                      <AssistantChatMessageBody content={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                  {!isAssistant ? (
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                      <UserRound className="h-5 w-5" aria-hidden />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {musicChat.isPending ? (
              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 motion-safe:animate-pulse dark:text-violet-400">
                  <Bot className="h-5 w-5 shrink-0" aria-hidden />
                </div>
                <div
                  className="max-w-[min(100%,28rem)] space-y-2 rounded-2xl border border-violet-200/30 bg-white/70 px-4 py-3 text-sm dark:bg-slate-950/35"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <p className="font-medium leading-snug text-foreground transition-all duration-300">
                    {thinkingSteps[thinkingStepIndex % thinkingSteps.length]}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("thinkingPatience")}
                  </p>
                  <div
                    className="relative h-1 overflow-hidden rounded-full bg-violet-200/40 dark:bg-violet-500/20"
                    aria-hidden
                  >
                    <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-violet-500/70 to-cyan-500/60 motion-safe:animate-onboarding-import-indeterminate dark:from-violet-400/80 dark:to-cyan-400/70" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-card-border p-4 sm:p-6">
            {errorMessage ? (
              <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {errorMessage}
              </p>
            ) : null}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="ask-soundprint-input">
                {t("inputLabel")}
              </label>
              <textarea
                id="ask-soundprint-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={musicChat.isPending || isPublicDemoViewer || interactiveAiBlockedByGenreBackfill}
                placeholder={
                  isPublicDemoViewer
                    ? t("publicDemoPlaceholder")
                    : (personalizedPlaceholder ?? t("inputPlaceholder"))
                }
                rows={2}
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-card-border bg-background px-4 py-3 text-sm shadow-inner outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={
                  musicChat.isPending ||
                  isPublicDemoViewer ||
                  interactiveAiBlockedByGenreBackfill ||
                  !input.trim()
                }
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden />
                {t("send")}
              </button>
            </form>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-card-border bg-card-surface p-4 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("presetTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("presetDescription")}
            </p>
            <p className="mt-2 rounded-xl border border-cyan-200/40 bg-cyan-50/70 px-3 py-2 text-xs leading-relaxed text-cyan-950 dark:border-cyan-300/15 dark:bg-cyan-950/25 dark:text-cyan-100">
              {t("customizeHint")}
            </p>
            <p className="mt-2 rounded-xl border border-amber-200/50 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-100">
              {t("heavyPresetHistoryNotice")}
            </p>
            <details open className="group mt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-violet-200/40 bg-violet-50/70 px-4 py-3 text-left text-sm font-semibold text-violet-950 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-300/15 dark:bg-violet-950/25 dark:text-violet-100 dark:hover:bg-violet-900/35">
                <span>{t("supportedGuideTitle")}</span>
                <ChevronDown
                  className="h-4 w-4 text-violet-700 transition group-open:rotate-180 dark:text-violet-200"
                  aria-hidden
                />
              </summary>
              <div className="mt-4 space-y-5">
                {QUICK_QUESTION_SECTIONS.map((section) => (
                  <div key={section.titleKey} className="space-y-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t(`presetSections.${section.titleKey}`)}
                    </p>
                    {section.examples.map((example) => {
                      return (
                        <button
                          key={example.id}
                          type="button"
                          disabled={
                            musicChat.isPending ||
                            isDateRangeLoading ||
                            interactiveAiBlockedByGenreBackfill
                          }
                          onClick={() => {
                            handlePresetClick(example.presetQuestionId);
                          }}
                          className="w-full rounded-xl border border-card-border bg-background/80 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-violet-950/25"
                        >
                          <span
                            className={
                              example.id === "artist-deep-dive"
                                ? "block text-[0.68rem] font-semibold tracking-[0.14em] text-violet-700 dark:text-violet-200"
                                : "block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200"
                            }
                          >
                            {example.id === "artist-deep-dive"
                              ? t.rich("examples.artist-deep-dive.labelRich", {
                                  em: (chunks) => (
                                    <em className="font-semibold italic text-violet-800 dark:text-violet-100">
                                      {chunks}
                                    </em>
                                  ),
                                })
                              : t(`examples.${example.id}.label`)}
                          </span>
                          <span className="mt-1 block text-sm font-medium leading-snug text-foreground">
                            {example.id === "artist-deep-dive"
                              ? deepDiveArtistName
                                ? t("artistDeepDiveQuestion", { artist: deepDiveArtistName })
                                : t("examples.artist-deep-dive.question")
                              : example.id === "top-tracks"
                                ? t("topTracksYearQuestion", {
                                    year: topTracksQuestionYear,
                                  })
                                : example.id === "top-artists"
                                  ? t("topArtistsYearQuestion", {
                                      year: topArtistsQuestionYear,
                                    })
                                  : example.id === "compare-periods"
                                    ? t("comparePeriodsQuestion", {
                                        earlierYear:
                                          comparePeriodsEarlierYear,
                                        laterYear:
                                          comparePeriodsLaterYear,
                                      })
                                    : example.id === "track-obsessions"
                                      ? t("trackObsessionsYearQuestion", {
                                          year:
                                            trackObsessionsQuestionYear,
                                        })
                                      : t(`examples.${example.id}.question`)}
                          </span>
                          {example.id === "time-of-day" ? (
                            <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                              {t("examples.time-of-day.recentWindowHint", {
                                days: LATE_NIGHT_PRESET_RECENT_WINDOW_DAYS,
                              })}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div className="rounded-2xl border border-card-border bg-card-surface p-4 text-sm leading-relaxed text-muted-foreground shadow-card">
            {t("guardrailHint")}
            <details className="group mt-3">
              <summary className="cursor-pointer list-none font-semibold text-foreground">
                {t("unsupportedTitle")}
              </summary>
              <p className="mt-2 text-muted-foreground">{t("unsupportedExamples")}</p>
            </details>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function AskYourSoundprintPage() {
  return (
    <Suspense fallback={<MusicChatFallback />}>
      <MusicChatContent />
    </Suspense>
  );
}
