"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  CalendarRange,
  ChevronRight,
  ListTree,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AssistantChatMessageBody } from "@/lib/components/assistant-chat-message-body";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import type { MusicChatMessage } from "@/lib/dto/music-chat";
import { getProfileDateRangeParts } from "@/lib/utils/musical-profile-date-range";

const KEYBOARD_OPEN_INSET_PX = 50;

export function AskSoundprintPresetRow({
  label,
  question,
  hint,
  disabled,
  onSelect,
  ariaLabel,
}: {
  label: ReactNode;
  question: string;
  hint?: string;
  disabled: boolean;
  onSelect: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={ariaLabel}
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left text-gray-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.7rem] font-semibold tracking-wide text-violet-700 dark:text-violet-200">
          {label}
        </span>
        <span className="mt-0.5 block text-sm font-medium leading-5 text-gray-950 dark:text-white">
          {question}
        </span>
        {hint ? (
          <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
            {hint}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
    </button>
  );
}

function AskSoundprintMobilePeriodChip({
  startDate,
  endDate,
  isAll,
  locale,
}: {
  startDate?: string;
  endDate?: string;
  isAll: boolean;
  locale: string;
}) {
  const t = useTranslations("askSoundprint");
  const parts = getProfileDateRangeParts(startDate, endDate, locale, "compact");
  if (!parts) return null;

  return (
    <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
      <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {isAll
          ? t("periodChipAll", { range: parts.compactLabel })
          : t("periodChip", { range: parts.compactLabel })}
      </span>
    </span>
  );
}

function AskSoundprintMobileMessages({
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
                <UserRound className="h-5 w-5 shrink-0" aria-hidden />
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
            <p className="font-medium leading-snug text-slate-900 dark:text-white">
              {thinkingSteps[thinkingStepIndex % thinkingSteps.length]}
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t("thinkingPatience")}
            </p>
            <div className="relative h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden>
              <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-violet-500/80 to-cyan-500/70 motion-safe:animate-onboarding-import-indeterminate dark:from-violet-400/90 dark:to-cyan-400/75" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AskSoundprintMobileSkeleton() {
  return (
    <section className="-mx-4 -mt-4 space-y-4 lg:hidden" aria-busy="true">
      <div className="bg-slate-950 px-4 pb-5 pt-4">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-white/15" />
        <div className="mt-3 h-8 w-24 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="space-y-3 px-4">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="ml-12 h-24 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
        <div className="h-11 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      </div>
    </section>
  );
}

export function AskSoundprintMobileExperience({
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
  presetsDisabled,
  hasUserMessages,
  startDate,
  endDate,
  isAll,
  locale,
  featuredRow,
  playbook,
  sheetHints,
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
  presetsDisabled: boolean;
  hasUserMessages: boolean;
  startDate?: string;
  endDate?: string;
  isAll: boolean;
  locale: string;
  featuredRow: ReactNode;
  playbook: ReactNode;
  sheetHints: ReactNode;
}) {
  const t = useTranslations("askSoundprint");
  const [presetSheetOpen, setPresetSheetOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(72);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, isPending]);

  useEffect(() => {
    if (hasUserMessages) setPresetSheetOpen(false);
  }, [hasUserMessages]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    const update = () => setComposerHeight(node.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  const keyboardOpen = keyboardInset > KEYBOARD_OPEN_INSET_PX;
  const composerBottom = keyboardOpen
    ? keyboardInset
    : `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)`;

  return (
    <>
      <section
        className="-mx-4 -mt-4 lg:hidden"
        aria-labelledby="ask-soundprint-mobile-title"
        style={{ paddingBottom: composerHeight }}
      >
        <header className="flex min-h-11 items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
          <div className="min-w-0 flex-1">
            <h1
              id="ask-soundprint-mobile-title"
              className={`truncate font-semibold tracking-tight ${hasUserMessages ? "text-sm" : "text-xl"}`}
            >
              {t("title")}
            </h1>
            {!hasUserMessages ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isPublicDemoViewer ? (
                  <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white/90">
                    {t("heroDemoPill")}
                  </span>
                ) : null}
                <AskSoundprintMobilePeriodChip
                  startDate={startDate}
                  endDate={endDate}
                  isAll={isAll}
                  locale={locale}
                />
              </div>
            ) : null}
          </div>
          {hasUserMessages ? (
            <div className="flex shrink-0 items-center gap-2">
              <AskSoundprintMobilePeriodChip
                startDate={startDate}
                endDate={endDate}
                isAll={isAll}
                locale={locale}
              />
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                disabled={presetsDisabled}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white disabled:opacity-60"
                aria-label={t("mobile.allQuestionsAria")}
              >
                <ListTree className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : (
            <Sparkles className="h-6 w-6 shrink-0 text-violet-200/90" aria-hidden />
          )}
        </header>

        {showGenreBackfillNotice ? (
          <div className="px-4 pt-3">
            <InteractiveAiGenreBackfillNotice
              force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
            />
          </div>
        ) : null}

        <div className="space-y-4 px-4 py-4">
          <AskSoundprintMobileMessages
            messages={visibleMessages}
            thinkingStepIndex={thinkingStepIndex}
            thinkingSteps={thinkingSteps}
            isPending={isPending}
          />
          <div ref={messagesEndRef} aria-hidden />

          {!hasUserMessages ? (
            <div className="space-y-2">
              {featuredRow}
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                disabled={presetsDisabled}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left text-gray-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t("allQuestions")}
                  </span>
                  <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t("mobile.allQuestionsRowLead")}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div
        ref={composerRef}
        id="ask-soundprint-composer"
        className="fixed inset-x-0 z-[19] border-t border-card-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{ bottom: composerBottom }}
      >
        {errorMessage ? (
          <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label className="sr-only" htmlFor="ask-soundprint-input-mobile">
            {t("inputLabel")}
          </label>
          <textarea
            id="ask-soundprint-input-mobile"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            disabled={freeTextDisabled}
            placeholder={inputPlaceholder}
            rows={1}
            className="min-h-11 max-h-28 flex-1 resize-none rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={freeTextDisabled || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
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
          <div className="mt-3">{sheetHints}</div>
          <div className="mt-4 space-y-5">{playbook}</div>
        </div>
      </MobileBottomSheet>
    </>
  );
}
