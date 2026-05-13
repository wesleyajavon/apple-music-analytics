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
  t: (key: string, values?: Record<string, string | number | boolean | Date>) => string
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

function severityDotClass(severity: NotificationItem["severity"]): string {
  switch (severity) {
    case "success":
      return "bg-accent-emerald";
    case "warning":
      return "bg-amber-500";
    case "error":
      return "bg-accent-rose";
    default:
      return "bg-primary";
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
        className="relative rounded-lg p-2.5 text-muted transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-rose px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("panelTitle")}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-card-border bg-surface-raised shadow-card"
        >
          <div className="flex items-center justify-between border-b border-card-border px-3 py-3">
            <span className="text-sm font-semibold text-foreground">{t("panelTitle")}</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-primary/10 hover:text-foreground"
                >
                  {t("markAllRead")}
                </button>
              ) : null}
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-primary/10 hover:text-foreground"
                >
                  {t("clearAll")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[min(24rem,50vh)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-card-border">
                {items.map((n) => {
                  const timeLabel = formatListTime(n.createdAt, locale);
                  const display = formatNotificationDisplay(n, t);
                  const isGroqNudge = isGenreGroqNudgeNotification(n);
                  const isStartingGroq = groqStartingId === n.id;

                  const textBlock = (
                    <>
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDotClass(n.severity)} ${n.read ? "opacity-40" : ""}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium leading-snug ${n.read ? "text-muted" : "text-foreground"}`}
                        >
                          {display.title}
                        </p>
                        {display.body ? (
                          <p className="mt-1 text-xs leading-relaxed text-muted">{display.body}</p>
                        ) : null}
                        {timeLabel ? (
                          <p className="mt-1.5 text-[11px] text-muted/80">{timeLabel}</p>
                        ) : null}
                      </div>
                    </>
                  );

                  if (isGroqNudge) {
                    return (
                      <li key={n.id}>
                        <div className="flex flex-col gap-2 px-3 py-3">
                          <div className="flex gap-3">{textBlock}</div>
                          <p className="pl-8 text-[10px] leading-snug text-muted">
                            {t("genreGroqNudge.privacyHint")}
                          </p>
                          <div className="pl-8">
                            <button
                              type="button"
                              disabled={isStartingGroq || hasActiveGroqJob}
                              aria-busy={isStartingGroq}
                              className="inline-flex min-h-[32px] w-full items-center justify-center rounded-lg bg-accent-violet px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link
                          href={n.href}
                          onClick={() => {
                            markRead(n.id);
                            setOpen(false);
                          }}
                          className="flex gap-3 px-3 py-3 transition-colors hover:bg-primary/5"
                        >
                          {textBlock}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-primary/5"
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
