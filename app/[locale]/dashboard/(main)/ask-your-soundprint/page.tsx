"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bot, ChevronDown, Send, Sparkles, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useMusicChat } from "@/lib/hooks/use-music-chat";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import type {
  MusicChatMessage,
  MusicChatPresetQuestionId,
} from "@/lib/dto/music-chat";

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

const QUICK_QUESTION_SECTIONS: Array<{
  titleKey: "core" | "maestroUpgrade";
  examples: Array<{
    id: QuickQuestionId;
    presetQuestionId?: MusicChatPresetQuestionId;
  }>;
}> = [
  {
    titleKey: "core",
    examples: [
      { id: "top-tracks", presetQuestionId: "summer-2022-top-tracks" },
      { id: "top-artists" },
      { id: "genre-breakdown" },
      { id: "compare-periods" },
      { id: "yearly-trends" },
      { id: "consistent-artists", presetQuestionId: "consistent-artists" },
      { id: "time-of-day", presetQuestionId: "late-night-habits" },
    ],
  },
  {
    titleKey: "maestroUpgrade",
    examples: [
      { id: "artist-deep-dive", presetQuestionId: "artist-deep-dive" },
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

function formatError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function MusicChatContent() {
  const t = useTranslations("askSoundprint");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const musicChat = useMusicChat();
  const {
    startDate,
    endDate,
    isAll,
    isLoading: isDateRangeLoading,
  } = useListenDateRange();
  const [messages, setMessages] = useState<MusicChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    presetQuestionId?: MusicChatPresetQuestionId
  ) {
    const trimmed = content.trim();
    if (!trimmed && !presetQuestionId) return;
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
      setErrorMessage(formatError(error, t("genericError")));
      setMessages(messages);
      setInput(trimmed);
    }
  }

  function handlePresetClick(presetQuestionId: MusicChatPresetQuestionId) {
    sendMessage(t(`presets.${presetQuestionId}`), presetQuestionId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-200">
                      <Bot className="h-5 w-5" aria-hidden />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? "border border-violet-200/30 bg-white/70 text-foreground dark:bg-slate-950/35"
                        : "bg-violet-600 text-white shadow-sm shadow-violet-950/20"
                    }`}
                  >
                    {message.content}
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
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-200">
                  <Bot className="h-5 w-5" aria-hidden />
                </div>
                <div className="rounded-2xl border border-violet-200/30 bg-white/70 px-4 py-3 text-sm text-muted-foreground dark:bg-slate-950/35">
                  {t("thinking")}
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
                disabled={musicChat.isPending || isPublicDemoViewer}
                placeholder={
                  isPublicDemoViewer
                    ? t("publicDemoPlaceholder")
                    : t("inputPlaceholder")
                }
                rows={2}
                className="min-h-[52px] flex-1 resize-none rounded-2xl border border-card-border bg-background px-4 py-3 text-sm shadow-inner outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={musicChat.isPending || isPublicDemoViewer || !input.trim()}
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
                      const isDemoBlocked =
                        isPublicDemoViewer && !example.presetQuestionId;
                      return (
                        <button
                          key={example.id}
                          type="button"
                          disabled={
                            musicChat.isPending ||
                            isDateRangeLoading ||
                            isDemoBlocked
                          }
                          onClick={() =>
                            example.presetQuestionId
                              ? handlePresetClick(example.presetQuestionId)
                              : sendMessage(t(`examples.${example.id}.question`))
                          }
                          className="w-full rounded-xl border border-card-border bg-background/80 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-violet-950/25"
                        >
                          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
                            {t(`examples.${example.id}.label`)}
                          </span>
                          <span className="mt-1 block text-sm font-medium leading-snug text-foreground">
                            {t(`examples.${example.id}.question`)}
                          </span>
                          {isDemoBlocked ? (
                            <span className="mt-2 block text-xs text-muted-foreground">
                              {t("demoPresetOnlyHint")}
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
