"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { CalendarRange, ChevronRight, ListTree } from "lucide-react";
import {
  AskSoundprintChatMessages,
  AskSoundprintComposer,
  AskSoundprintMark,
} from "@/lib/components/ask-soundprint-chat";
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
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-violet-700 dark:text-violet-200">
          {label}
        </span>
        <span className="mt-0.5 block text-sm font-medium leading-5 text-slate-900 dark:text-white">
          {question}
        </span>
        {hint ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
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
    <span className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/90">
      <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {isAll
          ? t("periodChipAll", { range: parts.compactLabel })
          : t("periodChip", { range: parts.compactLabel })}
      </span>
    </span>
  );
}

export function AskSoundprintMobileSkeleton() {
  return (
    <section className="lg:hidden" aria-busy="true">
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="h-14 w-14 animate-pulse rounded-full bg-violet-200/70 dark:bg-violet-500/20" />
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200/80 dark:bg-white/10" />
        <div className="h-4 w-40 animate-pulse rounded-lg bg-slate-200/60 dark:bg-white/5" />
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
  const showEmptyState = !hasUserMessages && !isPending;

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, isPending]);

  useEffect(() => {
    if (visibleMessages.length === 0) return;
    setPresetSheetOpen(false);
  }, [visibleMessages.length]);

  function closeSheetAfterPresetClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;
    setPresetSheetOpen(false);
  }

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
        className="lg:hidden"
        aria-labelledby="ask-soundprint-mobile-title"
        style={{ paddingBottom: composerHeight }}
      >
        <header className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
          {hasUserMessages ? (
            <h1
              id="ask-soundprint-mobile-title"
              className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              <AskSoundprintMark size="sm" />
              <span className="truncate">{t("title")}</span>
            </h1>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {isPublicDemoViewer && !hasUserMessages ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white/90">
                {t("heroDemoPill")}
              </span>
            ) : null}
            <AskSoundprintMobilePeriodChip
              startDate={startDate}
              endDate={endDate}
              isAll={isAll}
              locale={locale}
            />
            {hasUserMessages ? (
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                disabled={presetsDisabled}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-700 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-white"
                aria-label={t("mobile.allQuestionsAria")}
              >
                <ListTree className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
          </div>
        </header>

        {showGenreBackfillNotice ? (
          <div className="px-4 pt-1">
            <InteractiveAiGenreBackfillNotice
              force={genreClassify423Notice && !interactiveAiBlockedByGenreBackfill}
            />
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="flex flex-col items-center px-4 pb-6 pt-8">
            <AskSoundprintMark size="lg" className="mb-5" />
            <h1
              id="ask-soundprint-mobile-title"
              className="text-center text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              {t("title")}
            </h1>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("compactTrust")}
            </p>
            {isPublicDemoViewer ? (
              <p className="mt-2 max-w-sm text-center text-xs text-slate-500 dark:text-slate-400">
                {t("publicDemoMode")}
              </p>
            ) : null}
            <div className="mt-8 w-full space-y-2">
              {featuredRow}
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                disabled={presetsDisabled}
                className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t("allQuestions")}
                  </span>
                  <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t("mobile.allQuestionsRowLead")}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-3 py-2">
            <AskSoundprintChatMessages
              messages={visibleMessages}
              thinkingStepIndex={thinkingStepIndex}
              thinkingSteps={thinkingSteps}
              isPending={isPending}
            />
            <div ref={messagesEndRef} aria-hidden />
          </div>
        )}
      </section>

      <div
        ref={composerRef}
        id="ask-soundprint-composer"
        className="fixed inset-x-0 z-[19] bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-3 pt-2 lg:hidden"
        style={{ bottom: composerBottom }}
      >
        {errorMessage ? (
          <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        <AskSoundprintComposer
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
          <div className="mt-3">{sheetHints}</div>
          <div className="mt-4 space-y-5" onClick={closeSheetAfterPresetClick}>
            {playbook}
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
}
