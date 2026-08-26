"use client";

import {
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { AssistantChatMessageBody } from "@/lib/components/assistant-chat-message-body";
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
      <div className="flex items-end gap-1.5 rounded-[1.75rem] border border-slate-200/90 bg-white px-2 py-2 shadow-[0_8px_28px_rgba(15,23,42,0.08)] focus-within:border-violet-300/80 focus-within:shadow-[0_10px_32px_rgba(139,92,246,0.12)] dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/30 dark:focus-within:border-violet-400/40">
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
          className={`min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500 ${
            isMobile ? "text-base" : "text-[15px] leading-6"
          }`}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-sm shadow-violet-500/25 transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
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
}: {
  label: ReactNode;
  question: string;
  hint?: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex min-h-[5.5rem] flex-col items-start rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-violet-300/70 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/35 dark:hover:bg-white/[0.06]"
    >
      <span className="line-clamp-1 text-xs font-medium text-violet-700 dark:text-violet-200">
        {label}
      </span>
      <span className="mt-1 line-clamp-3 text-sm font-medium leading-5 text-slate-800 dark:text-slate-100">
        {question}
      </span>
      {hint ? (
        <span className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
