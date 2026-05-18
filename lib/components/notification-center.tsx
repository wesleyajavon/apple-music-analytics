"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { GENRE_AI_NUDGE_NOTIFICATION_SOURCE } from "@/lib/constants/genre-ai-nudge-notification";
import { useNotifications, type NotificationItem } from "@/lib/context/notification-center-context";
import { useGenreBackfillJob } from "@/lib/context/genre-backfill-job-context";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

function formatNotificationDisplay(
  n: NotificationItem,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): { title: string; body?: string } {
  if (n.genreGroqNudge) {
    return {
      title: t("genreGroqNudge.title"),
      body: t("genreGroqNudge.body", {
        pct: n.genreGroqNudge.pct,
        count: n.genreGroqNudge.count,
      }),
    };
  }
  if (n.source === GENRE_AI_NUDGE_NOTIFICATION_SOURCE && n.title.startsWith("components.")) {
    return {
      title: t("genreGroqNudge.title"),
      body: t("genreGroqNudge.legacyBody"),
    };
  }
  return { title: n.title, body: n.body };
}

function isGenreGroqNudgeNotification(n: NotificationItem): boolean {
  return n.source === GENRE_AI_NUDGE_NOTIFICATION_SOURCE;
}

function severityStripeClass(severity: NotificationItem["severity"]): string {
  switch (severity) {
    case "success":
      return "bg-accent-emerald";
    case "warning":
      return "bg-amber-400";
    case "error":
      return "bg-accent-rose";
    default:
      return "bg-foreground/40 dark:bg-foreground/50";
  }
}

function formatListTime(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "";
  }
}

export function NotificationCenter() {
  const t = useTranslations("components.notificationCenter");
  const locale = useLocale();
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const { refreshStatus, hasActiveGroqJob } = useGenreBackfillJob();
  const [open, setOpen] = useState(false);
  const [groqStartingId, setGroqStartingId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const startGroqClassification = useCallback(
    async (notificationId: string) => {
      setGroqStartingId(notificationId);
      try {
        const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
          method: "POST",
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          toast.error(data.error ?? t("genreGroqNudge.startError"));
          return;
        }
        clearGenreBackfillBannerBlockingPrefs();
        toast.success(t("genreGroqNudge.startedToast"));
        markRead(notificationId);
        await refreshStatus();
        window.setTimeout(() => void refreshStatus(), 500);
      } catch {
        toast.error(t("genreGroqNudge.startError"));
      } finally {
        setGroqStartingId(null);
      }
    },
    [markRead, refreshStatus, t]
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("openLabel")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/80 text-muted shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur-sm transition-colors hover:border-foreground/15 hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_1px_2px_rgb(0_0_0/0.35)]"
      >
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-foreground px-1 font-mono text-[10px] font-medium tabular-nums text-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("panelTitle")}
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card/95 shadow-[0_0_0_1px_rgb(0_0_0/0.03),0_12px_40px_-12px_rgb(0_0_0/0.22)] backdrop-blur-xl dark:bg-card/95 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_20px_50px_-16px_rgb(0_0_0/0.65)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {t("panelTitle")}
              </p>
              {unreadCount > 0 ? (
                <p className="mt-1 font-mono text-[11px] tabular-nums text-muted/90">
                  {t("unreadSummary", { count: unreadCount })}
                </p>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-muted/80">{t("panelKicker")}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  {t("markAllRead")}
                </button>
              ) : null}
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  {t("clearAll")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[min(26rem,52vh)] overflow-y-auto overscroll-contain">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted/70">{t("emptyKicker")}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t("empty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((n) => {
                  const timeLabel = formatListTime(n.createdAt, locale);
                  const display = formatNotificationDisplay(n, t);
                  const isGroqNudge = isGenreGroqNudgeNotification(n);
                  const isStartingGroq = groqStartingId === n.id;
                  const stripe = severityStripeClass(n.severity);

                  const textBlock = (
                    <div
                      className={`relative flex gap-3 pl-3.5 ${n.read ? "opacity-75" : ""}`}
                    >
                      <span
                        className={`absolute left-0 top-2.5 h-[calc(100%-0.75rem)] min-h-[1.25rem] w-px rounded-full ${stripe} ${n.read ? "opacity-35" : ""}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 pb-0.5">
                        <p
                          className={`text-[13px] font-medium leading-snug tracking-tight ${n.read ? "text-muted" : "text-foreground"}`}
                        >
                          {display.title}
                        </p>
                        {display.body ? (
                          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{display.body}</p>
                        ) : null}
                        {timeLabel ? (
                          <p className="mt-2 font-mono text-[10px] tabular-nums uppercase tracking-wide text-muted/70">
                            {timeLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );

                  if (isGroqNudge) {
                    return (
                      <li key={n.id} className="bg-foreground/[0.02] dark:bg-white/[0.02]">
                        <div className="flex flex-col gap-3 px-4 py-3.5">
                          {textBlock}
                          <p className="pl-3.5 text-[11px] leading-relaxed text-muted/90">
                            {t("genreGroqNudge.privacyHint")}
                          </p>
                          <div className="pl-3.5">
                            <button
                              type="button"
                              disabled={isStartingGroq || hasActiveGroqJob}
                              aria-busy={isStartingGroq}
                              className="inline-flex h-9 min-h-[36px] w-full items-center justify-center rounded-md border border-transparent bg-foreground px-4 text-[12px] font-medium text-background shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                              onClick={() => void startGroqClassification(n.id)}
                            >
                              {isStartingGroq
                                ? t("genreGroqNudge.classifying")
                                : t("genreGroqNudge.classifyCta")}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  const rowHover =
                    "transition-colors hover:bg-foreground/[0.03] dark:hover:bg-white/[0.04]";

                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            markRead(n.id);
                            setOpen(false);
                          }}
                          className={`block px-4 py-3.5 ${rowHover}`}
                        >
                          {textBlock}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className={`flex w-full px-4 py-3.5 text-left ${rowHover}`}
                        >
                          {textBlock}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
