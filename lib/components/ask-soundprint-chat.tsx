"use client";

import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Send } from "lucide-react";
import { AssistantChatMessageBody } from "@/lib/components/assistant-chat-message-body";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
} from "@/lib/components/dashboard-ui";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { useAssistantMessageReveal } from "@/lib/hooks/use-assistant-message-reveal";
import type { MusicChatMessage } from "@/lib/dto/music-chat";

const ASK_SOUNDPRINT_MARK_SIZE = {
  sm: "h-7 w-7 object-contain",
  md: "h-8 w-8 object-contain",
  lg: "h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]",
} as const;

export function AskSoundprintMark({
  size = "md",
  className = "",
  pulse = false,
}: {
  size?: keyof typeof ASK_SOUNDPRINT_MARK_SIZE;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 ${pulse ? "motion-safe:animate-pulse" : ""} ${className}`}
    >
      <SoundprintLogo
        src="/brand/favicon.png"
        showText={false}
        alt=""
        imageClassName={ASK_SOUNDPRINT_MARK_SIZE[size]}
      />
    </span>
  );
}

export function AskSoundprintBetaBadge({ className = "" }: { className?: string }) {
  const t = useTranslations("askSoundprint");
  return (
    <span
      title={t("betaHint")}
      className={`inline-flex shrink-0 translate-y-px items-center rounded-full border border-slate-200/70 px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-slate-400 dark:border-white/12 dark:text-slate-500 ${className}`}
    >
      {t("betaBadge")}
    </span>
  );
}

function TypingCaret() {
  return (
    <span
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-violet-500 motion-safe:animate-pulse dark:bg-violet-300"
      aria-hidden
    />
  );
}

export function AskSoundprintChatMessages({
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
  const { displayMessages, isRevealing } = useAssistantMessageReveal(messages);
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRevealing) return;
    streamEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [isRevealing, displayMessages]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-1">
      {displayMessages.map((message, index) => {
        const isAssistant = message.role === "assistant";
        const isStreamingAssistant =
          isRevealing && isAssistant && index === displayMessages.length - 1;
        return (
          <div
            key={`${message.role}-${index}`}
            className={
              isAssistant
                ? "flex gap-3 px-1 py-5 sm:gap-4 sm:px-2"
                : "flex justify-end px-1 py-3 sm:px-2"
            }
          >
            {isAssistant ? <AskSoundprintMark size="md" className="mt-0.5" /> : null}
            {isAssistant ? (
              <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-7 text-slate-800 dark:text-slate-100">
                {message.content ? (
                  <AssistantChatMessageBody
                    content={message.content}
                    className={
                      isStreamingAssistant
                        ? "[&_p:last-child]:inline"
                        : undefined
                    }
                  />
                ) : null}
                {isStreamingAssistant ? <TypingCaret /> : null}
              </div>
            ) : (
              <div className="max-w-[min(100%,36rem)] whitespace-pre-wrap rounded-[1.4rem] bg-slate-100 px-4 py-2.5 text-[15px] leading-6 text-slate-900 dark:bg-white/[0.09] dark:text-white">
                {message.content}
              </div>
            )}
          </div>
        );
      })}
      {isPending ? (
        <div className="flex gap-3 px-1 py-5 sm:gap-4 sm:px-2" aria-live="polite" aria-busy="true">
          <AskSoundprintMark size="md" className="mt-0.5" pulse />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <p className="text-[15px] font-medium leading-6 text-slate-800 dark:text-slate-100">
              {thinkingSteps[thinkingStepIndex % thinkingSteps.length]}
            </p>
            <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">
              {t("thinkingPatience")}
            </p>
            <div className="relative h-1 max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden>
              <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-violet-500/80 to-cyan-500/70 motion-safe:animate-onboarding-import-indeterminate dark:from-violet-400/90 dark:to-cyan-400/75" />
            </div>
          </div>
        </div>
      ) : null}
      <div ref={streamEndRef} aria-hidden />
    </div>
  );
}

export function AskSoundprintComposer({
  input,
  onInputChange,
  onSubmit,
  disabled,
  placeholder,
  layout = "desktop",
  leadingAction,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  placeholder: string;
  layout?: "desktop" | "mobile";
  leadingAction?: ReactNode;
}) {
  const t = useTranslations("askSoundprint");
  const isMobile = layout === "mobile";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, isMobile ? 112 : 168)}px`;
  }, [input, isMobile]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isMobile) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label className="sr-only" htmlFor={isMobile ? "ask-soundprint-input-mobile" : "ask-soundprint-input"}>
        {t("inputLabel")}
      </label>
      <div className="flex items-end gap-1.5 rounded-full border border-glass-hairline bg-surface-raised/90 px-2 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-surface-raised/75 focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-ring dark:bg-white/[0.06] motion-reduce:backdrop-blur-none [@media(prefers-reduced-transparency:reduce)]:bg-surface-raised [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none">
        {leadingAction}
        <textarea
          ref={textareaRef}
          id={isMobile ? "ask-soundprint-input-mobile" : "ask-soundprint-input"}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={`min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 ${
            isMobile ? "text-base" : "text-[15px] leading-6"
          }`}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={t("send")}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}

export function AskSoundprintSuggestionTile({
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
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={ariaLabel}
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} text-foreground transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-muted">{label}</span>
        <span className="mt-0.5 block text-[15px] font-semibold leading-5 tracking-tight">
          {question}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[13px] leading-5 text-muted">{hint}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
