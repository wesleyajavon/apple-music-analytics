"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { AI_MASTER_QUERY_KEY } from "@/lib/hooks/use-ai-master-toggle";
import { GROQ_AI_CONSENT_SETTINGS_PATH } from "@/lib/constants/groq-ai-settings";

type GroqAiConsentPromptOptions = {
  onGranted?: () => void;
  onDeclined?: () => void;
};

type GroqAiConsentPromptContextValue = {
  openGroqAiConsentPrompt: (options?: GroqAiConsentPromptOptions) => void;
  closeGroqAiConsentPrompt: () => void;
  isGroqAiConsentPromptOpen: boolean;
};

const GroqAiConsentPromptContext = createContext<GroqAiConsentPromptContextValue | null>(null);

export function useGroqAiConsentPrompt(): GroqAiConsentPromptContextValue {
  const ctx = useContext(GroqAiConsentPromptContext);
  if (!ctx) {
    throw new Error("useGroqAiConsentPrompt must be used within GroqAiConsentPromptProvider");
  }
  return ctx;
}

function GroqAiConsentSheet({
  open,
  onClose,
  onAccept,
  accepting,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  accepting: boolean;
}) {
  const t = useTranslations("groqAiConsentPrompt");
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !accepting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [accepting, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label={t("decline")}
        disabled={accepting}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[201] w-full max-w-lg rounded-t-[1.5rem] border border-border bg-background px-5 py-6 shadow-[0_-16px_48px_rgb(0_0_0_/0.2)] sm:rounded-2xl sm:shadow-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted/60 sm:hidden" aria-hidden />

        <div className="flex gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("body")}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" aria-hidden />
                <span>{t("bulletInsights")}</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" aria-hidden />
                <span>{t("bulletTransfer")}</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" aria-hidden />
                <span>{t("bulletRevoke")}</span>
              </li>
            </ul>
            <p className="mt-4 text-sm">
              <Link
                href="/legal/privacy"
                className="font-semibold text-accent-violet underline-offset-2 hover:underline"
              >
                {t("privacyLink")}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <button
            type="button"
            disabled={accepting}
            onClick={onAccept}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 sm:w-auto"
          >
            {accepting ? t("accepting") : t("accept")}
          </button>
          <button
            type="button"
            disabled={accepting}
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("decline")}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href={GROQ_AI_CONSENT_SETTINGS_PATH} className="font-medium underline-offset-2 hover:underline">
            {t("manageInSettings")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function GroqAiConsentPromptProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("groqAiConsentPrompt");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const optionsRef = useRef<GroqAiConsentPromptOptions>({});

  const closeGroqAiConsentPrompt = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) {
        optionsRef.current.onDeclined?.();
      }
      optionsRef.current = {};
      return false;
    });
  }, []);

  const openGroqAiConsentPrompt = useCallback((options?: GroqAiConsentPromptOptions) => {
    optionsRef.current = options ?? {};
    setOpen(true);
  }, []);

  const grantMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/privacy-preferences", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groqGenreConsent: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t("error"));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AI_MASTER_QUERY_KEY });
      void queryClient.invalidateQueries();
      toast.success(t("grantedToast"));
      const onGranted = optionsRef.current.onGranted;
      optionsRef.current = {};
      setOpen(false);
      onGranted?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || t("error"));
    },
  });

  const value: GroqAiConsentPromptContextValue = {
    openGroqAiConsentPrompt,
    closeGroqAiConsentPrompt,
    isGroqAiConsentPromptOpen: open,
  };

  return (
    <GroqAiConsentPromptContext.Provider value={value}>
      {children}
      <GroqAiConsentSheet
        open={open}
        onClose={closeGroqAiConsentPrompt}
        onAccept={() => grantMutation.mutate()}
        accepting={grantMutation.isPending}
      />
    </GroqAiConsentPromptContext.Provider>
  );
}
