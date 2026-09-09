"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_GLASS_FLOATING_PANE,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import {
  GENRE_BACKFILL_OPEN_PROGRESS_EVENT,
  GENRE_BACKFILL_PROGRESS_PANEL_ID,
} from "@/lib/constants/genre-backfill-result-notification";
import { GENRE_AI_NUDGE_NOTIFICATION_SOURCE } from "@/lib/constants/genre-ai-nudge-notification";
import { isDuetFriendRequestSource } from "@/lib/constants/duet-friend-request-notification";
import { useNotifications, type NotificationItem } from "@/lib/context/notification-center-context";
import { useGenreBackfillJob } from "@/lib/context/genre-backfill-job-context";
import { useDuetPendingIncoming } from "@/lib/hooks/use-duet-pending-incoming";
import {
  buildDuetFriendRequestNotification,
  isClientActivityNotification,
  mergeNotificationItems,
} from "@/lib/utils/duet-friend-request-notifications";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

const FOOTER_ACTION =
  "inline-flex min-h-11 flex-1 items-center justify-center px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55";

const ROW_SHELL = `block w-full px-4 py-3 text-left ${DASHBOARD_LIST_SEPARATOR} ${DASHBOARD_LIST_ROW_INTERACTIVE}`;

function formatNotificationDisplay(
  n: NotificationItem,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): { title: string; body?: string } {
  if (n.duetFriendRequest) {
    return {
      title: t("duetFriendRequest.title", { name: n.duetFriendRequest.requesterName }),
      body: t("duetFriendRequest.body"),
    };
  }
  if (n.genreGroqNudge) {
    return {
      title: t("genreGroqNudge.title"),
      body: t("genreGroqNudge.body", {
        pct: n.genreGroqNudge.pct,
        count: n.genreGroqNudge.count,
      }),
    };
  }
  if (n.importComplete) {
    return {
      title: t("importComplete.title"),
      body: t("importComplete.body", { count: n.importComplete.count }),
    };
  }
  if (n.genreBackfillResult) {
    if (n.genreBackfillResult.status === "failed") {
      return {
        title: t("genreBackfillResult.failed.title"),
        body: t("genreBackfillResult.failed.body"),
      };
    }
    return {
      title: t("genreBackfillResult.completed.title"),
      body: t("genreBackfillResult.completed.body"),
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

function isDuetFriendRequestNotification(n: NotificationItem): boolean {
  return isDuetFriendRequestSource(n.source) || n.duetFriendRequest != null;
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
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d);
    }
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

type RowContentProps = {
  n: NotificationItem;
  display: { title: string; body?: string };
  timeLabel: string;
  stripe: string;
  footer?: ReactNode;
};

function NotificationRowContent({ n, display, timeLabel, stripe, footer }: RowContentProps) {
  return (
    <div className={`relative pl-3 ${n.read ? "opacity-70" : ""}`}>
      <span
        className={`absolute left-0 top-1.5 h-4 w-0.5 rounded-full ${stripe} ${n.read ? "opacity-40" : ""}`}
        aria-hidden
      />
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`min-w-0 flex-1 text-[13px] leading-snug tracking-tight ${
            n.read ? "font-medium text-muted" : "font-semibold text-foreground"
          }`}
        >
          {display.title}
        </p>
        {timeLabel ? (
          <time
            dateTime={n.createdAt}
            className="shrink-0 text-[11px] tabular-nums text-muted/70"
          >
            {timeLabel}
          </time>
        ) : null}
      </div>
      {display.body ? (
        <p className="mt-1 text-[12px] leading-relaxed text-muted line-clamp-2">{display.body}</p>
      ) : null}
      {footer}
    </div>
  );
}

export function NotificationCenter() {
  const t = useTranslations("components.notificationCenter");
  const locale = useLocale();
  const { items, markRead, markAllRead, clearAll } = useNotifications();
  const { pendingIncoming } = useDuetPendingIncoming();
  const { refreshStatus, hasActiveGroqJob, job: backfillJob } = useGenreBackfillJob();
  const [open, setOpen] = useState(false);
  const [groqStartingId, setGroqStartingId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const serverDuetItems = useMemo(
    () => pendingIncoming.map((friendship) => buildDuetFriendRequestNotification(friendship)),
    [pendingIncoming]
  );

  const displayItems = useMemo(
    () => mergeNotificationItems(items, serverDuetItems),
    [items, serverDuetItems]
  );

  const unreadCount = useMemo(
    () => displayItems.filter((item) => !item.read).length,
    [displayItems]
  );

  const clientItems = useMemo(
    () => displayItems.filter(isClientActivityNotification),
    [displayItems]
  );
  const hasClientUnread = useMemo(
    () => clientItems.some((item) => !item.read),
    [clientItems]
  );
  const hasClientItems = clientItems.length > 0;
  const showFooterActions = hasClientUnread || hasClientItems;

  const backfillProgress = useMemo(() => {
    if (!backfillJob || !hasActiveGroqJob) return null;
    if (backfillJob.maxArtists <= 0) return null;
    return Math.min(
      100,
      Math.round((backfillJob.artistsProcessed / backfillJob.maxArtists) * 100)
    );
  }, [backfillJob, hasActiveGroqJob]);

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
        className="relative inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-glass-hairline bg-surface-raised/80 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-lg:h-11 max-lg:w-11"
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
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-background bg-muted px-1 text-[10px] font-medium tabular-nums text-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("panelTitle")}
          className={`absolute right-0 top-[calc(100%+0.375rem)] z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden ${DASHBOARD_GLASS_FLOATING_PANE}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("panelTitle")}</p>
            {unreadCount > 0 ? (
              <p className="shrink-0 text-[12px] tabular-nums text-muted">
                {t("unreadSummary", { count: unreadCount })}
              </p>
            ) : null}
          </div>

          <div className="max-h-[min(22rem,48vh)] overflow-y-auto overscroll-contain border-t border-glass-hairline">
            {hasActiveGroqJob && backfillJob ? (
              <a
                href={`#${GENRE_BACKFILL_PROGRESS_PANEL_ID}`}
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event(GENRE_BACKFILL_OPEN_PROGRESS_EVENT));
                }}
                className={`${ROW_SHELL} no-underline text-foreground`}
              >
                <div className="w-full">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug tracking-tight text-foreground">
                      {backfillJob.status === "paused"
                        ? t("liveBackfill.paused")
                        : t("liveBackfill.running")}
                    </p>
                    {backfillProgress != null ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-muted">
                        {backfillProgress}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">
                    {t("liveBackfill.openHint")}
                  </p>
                  {backfillProgress != null ? (
                    <div
                      className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{ width: `${backfillProgress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </a>
            ) : null}

            {displayItems.length === 0 && !(hasActiveGroqJob && backfillJob) ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[13px] font-medium text-foreground">{t("emptyKicker")}</p>
                <p className="mx-auto mt-2 max-w-[16rem] text-[12px] leading-relaxed text-muted">
                  {t("empty")}
                </p>
              </div>
            ) : displayItems.length === 0 ? null : (
              <ul>
                {displayItems.map((n) => {
                  const timeLabel = formatListTime(n.createdAt, locale);
                  const display = formatNotificationDisplay(n, t);
                  const isGroqNudge = isGenreGroqNudgeNotification(n);
                  const isDuetFriendRequest = isDuetFriendRequestNotification(n);
                  const isStartingGroq = groqStartingId === n.id;
                  const stripe = severityStripeClass(n.severity);

                  if (isGroqNudge) {
                    return (
                      <li key={n.id} className={DASHBOARD_LIST_SEPARATOR}>
                        <div className="px-4 py-3">
                          <NotificationRowContent
                            n={n}
                            display={display}
                            timeLabel={timeLabel}
                            stripe={stripe}
                            footer={
                              <div className="mt-3 space-y-2">
                                <p className="text-[11px] leading-relaxed text-muted/80">
                                  {t("genreGroqNudge.privacyHint")}
                                </p>
                                <button
                                  type="button"
                                  disabled={isStartingGroq || hasActiveGroqJob}
                                  aria-busy={isStartingGroq}
                                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                  onClick={() => void startGroqClassification(n.id)}
                                >
                                  {isStartingGroq
                                    ? t("genreGroqNudge.classifying")
                                    : t("genreGroqNudge.classifyCta")}
                                </button>
                              </div>
                            }
                          />
                        </div>
                      </li>
                    );
                  }

                  if (isDuetFriendRequest && n.href) {
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className={`${ROW_SHELL} no-underline text-foreground`}
                        >
                          <NotificationRowContent
                            n={n}
                            display={display}
                            timeLabel={timeLabel}
                            stripe={stripe}
                          />
                        </Link>
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
                          className={`${ROW_SHELL} no-underline text-foreground`}
                        >
                          <NotificationRowContent
                            n={n}
                            display={display}
                            timeLabel={timeLabel}
                            stripe={stripe}
                          />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className={ROW_SHELL}
                        >
                          <NotificationRowContent
                            n={n}
                            display={display}
                            timeLabel={timeLabel}
                            stripe={stripe}
                          />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {showFooterActions ? (
            <div className="flex items-stretch border-t border-glass-hairline">
              {hasClientUnread ? (
                <button type="button" onClick={() => markAllRead()} className={FOOTER_ACTION}>
                  {t("markAllRead")}
                </button>
              ) : null}
              {hasClientUnread && hasClientItems ? (
                <span className="w-px shrink-0 self-stretch bg-glass-hairline" aria-hidden />
              ) : null}
              {hasClientItems ? (
                <button type="button" onClick={() => clearAll()} className={FOOTER_ACTION}>
                  {t("clearAll")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
