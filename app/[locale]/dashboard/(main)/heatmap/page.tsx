"use client";

import {
  useMemo,
  useCallback,
  Suspense,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CalendarHeatmap,
  HeatmapDataPoint,
} from "@/lib/components/calendar-heatmap";
import {
  useTimeline,
  useListens,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapDayDetailsPanel } from "@/lib/components/heatmap-day-details-panel";
import { HeatmapSkeleton } from "@/lib/components/skeleton-loaders";
import { CalendarDays } from "lucide-react";

const CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-sky-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.11),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm dark:border-sky-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)]";

const HEATMAP_RAIL_CLASS = "bg-gradient-to-r from-emerald-300 via-sky-400 to-violet-400";
const HEATMAP_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-sky-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#0c4a6e_100%)] px-6 py-8 shadow-2xl shadow-sky-950/40 sm:px-8 sm:py-10";

function HeatmapHeroFrame({ badgeLabel, stats }: { badgeLabel: string; stats: ReactNode }) {
  const t = useTranslations("heatmap");
  return (
    <div className={HEATMAP_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(56,189,248,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-violet-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${HEATMAP_RAIL_CLASS} opacity-90`} />
      <div className="relative">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <CalendarDays className="h-9 w-9 shrink-0 text-emerald-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${HEATMAP_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(45,212,191,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-sky-100/90 sm:text-lg">{t("subtitle")}</p>
          <p className="mt-2 text-sm font-medium text-violet-100/90">
            <span className="inline-flex items-center rounded-full border border-sky-200/30 bg-white/10 px-3 py-1">
              {badgeLabel}
            </span>
          </p>
        </div>
        {stats}
      </div>
    </div>
  );
}

type HeatmapSummaryStats = {
  totalListens: number;
  daysWithListens: number;
  totalDays: number;
  averageListens: number;
  mostActiveWeekday: string;
};

function HeatmapHeroStats({ stats, locale }: { stats: HeatmapSummaryStats; locale: string }) {
  const t = useTranslations("heatmap");
  const pct =
    stats.totalDays > 0
      ? Math.round((stats.daysWithListens / stats.totalDays) * 100)
      : 0;
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-emerald-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">{t("totalListens")}</p>
        <p className="text-2xl font-bold text-white">{stats.totalListens.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-sky-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-sky-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-100/80">{t("activeDays")}</p>
        <p className="text-2xl font-bold text-white">
          {stats.daysWithListens.toLocaleString(locale)} / {stats.totalDays.toLocaleString(locale)}
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          {pct}% {t("ofDays")}
        </p>
      </div>
      <div className="rounded-xl border border-violet-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-violet-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-100/80">{t("avgDaily")}</p>
        <p className="text-2xl font-bold text-white">{stats.averageListens.toLocaleString(locale)}</p>
        <p className="mt-0.5 text-xs text-white/70">{t("listensPerDay")}</p>
      </div>
      <div className="rounded-xl border border-teal-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-teal-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-teal-100/80">{t("favoriteDay")}</p>
        <p className="text-2xl font-bold text-white">{stats.mostActiveWeekday}</p>
        <p className="mt-0.5 text-xs text-white/70">{t("favoriteDayHint")}</p>
      </div>
    </div>
  );
}

function HeatmapHeroStatsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="min-h-[92px] animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm"
        >
          <div className="mb-2 h-3 w-24 rounded bg-white/15" />
          <div className="h-8 w-20 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function HeatmapPageFallback() {
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  return (
    <div className="space-y-8">
      <HeatmapHeroFrame
        badgeLabel={tOverview("allData")}
        stats={<HeatmapHeroStatsSkeleton />}
      />
      <HeatmapSkeleton />
    </div>
  );
}

/** Normalise une date (string ou Date) en YYYY-MM-DD pour éviter Invalid Date */
function toDateOnly(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function HeatmapContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const selectedDateParam = searchParams.get("selectedDate");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    selectedDateParam,
  );
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && dayDetailsRef.current) {
      dayDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedDate]);

  // Même logique que /dashboard/overview : sans dates dans l’URL (« Tout »), undefined
  // pour que la timeline / l’analyse temporelle utilisent toute l’historique (min–max côté API).
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const { startDate: badgeStart, endDate: badgeEnd } = useListenDateRange();
  const badgeRangeLabel = formatOverviewDateRangeLabel(
    badgeStart,
    badgeEnd,
    locale,
  );
  const badgeLabel = badgeRangeLabel
    ? t("dateRangeBadge", { range: badgeRangeLabel })
    : tOverview("allData");

  // Récupérer les données de timeline (par jour)
  const {
    data: timelineData,
    isLoading,
    error,
    refetch,
  } = useTimeline(startDate, endDate, "day", userId);

  // Utiliser l'analyse temporelle pour "Jour préféré" - même logique que temporal-analysis
  // (EXTRACT(DOW FROM playedAt) en SQL), évite les bugs de timezone de getDay() côté client
  const { data: temporalData } = useTemporalAnalysis(
    startDate,
    endDate,
    userId,
  );

  // Bornes du calendrier : URL explicite, sinon min/max des points timeline (comme HeatmapCalendarOverviewWidget).
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (startDate && endDate) {
      return { rangeStart: startDate, rangeEnd: endDate };
    }
    if (!timelineData?.length) {
      return {
        rangeStart: undefined as string | undefined,
        rangeEnd: undefined as string | undefined,
      };
    }
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const sorted = [...dates].sort();
    return {
      rangeStart: sorted[0],
      rangeEnd: sorted[sorted.length - 1],
    };
  }, [startDate, endDate, timelineData]);

  const calendarStart = startDate ?? rangeStart;
  const calendarEnd = endDate ?? rangeEnd;

  // Transformer les données pour le heatmap
  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    if (!timelineData) return [];

    return timelineData.map((point) => ({
      date: point.date,
      count: point.listens,
    }));
  }, [timelineData]);

  // Calculer le nombre total de jours dans la plage (pour active days, etc.)
  const totalDaysInRange = useMemo(() => {
    if (!calendarStart || !calendarEnd) return 1;
    const start = new Date(calendarStart);
    const end = new Date(calendarEnd);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [calendarStart, calendarEnd]);

  // Pour la moyenne quotidienne : utiliser les jours du premier au dernier jour avec données
  // (pas 365 ni la plage filtrée) — évite de diluer la moyenne avec des jours sans données
  const daysForDailyAverage = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return 1;
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const first = new Date(
      Math.min(...dates.map((d) => new Date(d).getTime())),
    );
    const last = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    const diffTime = last.getTime() - first.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [timelineData]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return null;
    }

    const totalListens = timelineData.reduce(
      (sum, point) => sum + point.listens,
      0,
    );
    const daysWithListens = timelineData.filter(
      (point) => point.listens > 0,
    ).length;
    const averageListens = totalListens / daysForDailyAverage;

    const sortedByListens = [...timelineData].sort(
      (a, b) => b.listens - a.listens,
    );
    const maxListens = sortedByListens[0]?.listens || 0;
    const minListens =
      timelineData
        .filter((p) => p.listens > 0)
        .sort((a, b) => a.listens - b.listens)[0]?.listens || 0;

    const maxDay = sortedByListens[0];
    const minDay = timelineData
      .filter((p) => p.listens > 0)
      .sort((a, b) => a.listens - b.listens)[0];

    // Distribution par jour : utiliser temporalData (EXTRACT(DOW) en SQL) si dispo,
    // sinon fallback sur timeline (évite bugs timezone de getDay())
    // weekdayDistribution: index 0=Dimanche, 1=Lundi, ..., 6=Samedi (pour le chart)
    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    const weekdaysT = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    let mostActiveWeekday = "—";
    if (temporalData?.byDayOfWeek?.length) {
      temporalData.byDayOfWeek.forEach((d, i) => {
        weekdayDistribution[(i + 1) % 7] = d.listens; // temporal: Lun=0..Dim=6 → 0=Dim,1=Lun..
      });
      if (temporalData.peakDay != null) {
        mostActiveWeekday = t(
          `weekdays.${weekdaysT[temporalData.peakDay.dayOfWeek]}`,
        );
      }
    } else {
      timelineData.forEach((point) => {
        const dayOfWeek = new Date(
          toDateOnly(point.date) + "T12:00:00Z",
        ).getUTCDay();
        weekdayDistribution[dayOfWeek] += point.listens;
      });
      const weekdays = weekdaysT.map((k) => t(`weekdays.${k}`));
      const maxWeekdayIndex = weekdayDistribution.indexOf(
        Math.max(...weekdayDistribution),
      );
      mostActiveWeekday = weekdays[maxWeekdayIndex];
    }

    return {
      totalListens,
      daysWithListens,
      totalDays: totalDaysInRange,
      averageListens: Math.round(averageListens * 10) / 10,
      maxListens,
      minListens,
      maxDay: maxDay
        ? {
            date: maxDay.date,
            listens: maxDay.listens,
            formatted: new Date(
              toDateOnly(maxDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      minDay: minDay
        ? {
            date: minDay.date,
            listens: minDay.listens,
            formatted: new Date(
              toDateOnly(minDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      mostActiveWeekday,
    };
  }, [
    timelineData,
    temporalData,
    totalDaysInRange,
    daysForDailyAverage,
    t,
    locale,
  ]);

  const handleDayClick = useCallback((date: string, count: number) => {
    if (count === 0) {
      // Si pas d'écoutes, ne rien faire
      setSelectedDate(null);
      return;
    }

    // Stocker la date sélectionnée pour afficher les détails
    setSelectedDate(date);
  }, []);

  // Récupérer les écoutes détaillées du jour sélectionné
  // Le service listening-service.ts gère automatiquement l'inclusion de toute la journée
  const dayListensParams = useMemo(() => {
    if (!selectedDate) return undefined;

    return {
      startDate: selectedDate,
      endDate: selectedDate, // Le service ajustera automatiquement pour inclure toute la journée
      limit: 500, // Limite élevée pour avoir toutes les écoutes du jour
      userId,
    };
  }, [selectedDate, userId]);

  const { data: dayListensData, isLoading: isLoadingDayListens } = useListens(
    dayListensParams,
    { enabled: !!selectedDate },
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
        <ErrorState
          error={error}
          message={t("errorLoading")}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!isLoading && (!timelineData || timelineData.length === 0)) {
    return (
      <div className="space-y-8">
        <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
        <EmptyState {...emptyStatePresets.importData} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <HeatmapHeroFrame
          badgeLabel={badgeLabel}
          stats={
            isLoading ? (
              <HeatmapHeroStatsSkeleton />
            ) : stats ? (
              <HeatmapHeroStats
                stats={{
                  totalListens: stats.totalListens,
                  daysWithListens: stats.daysWithListens,
                  totalDays: stats.totalDays,
                  averageListens: stats.averageListens,
                  mostActiveWeekday: stats.mostActiveWeekday,
                }}
                locale={locale}
              />
            ) : null
          }
        />

        {/* Spotlight: Calendrier heatmap — élément principal mis en avant */}
        <section
          className={`${CARD_CLASS} animate-fade-in-up transition-all duration-300`}
          aria-labelledby="heatmap-spotlight-title"
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${HEATMAP_RAIL_CLASS} opacity-85`} />
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl dark:bg-sky-400/16" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-400/16" />
          <div className="relative">
            <div className="border-b border-sky-200/20 px-6 py-5 dark:border-sky-300/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-600 shadow-sm shadow-sky-950/10 dark:text-sky-200">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                </div>
                <div>
                  <h2
                    id="heatmap-spotlight-title"
                    className="text-lg font-semibold tracking-tight text-foreground"
                  >
                    {t("calendarTitle")}
                  </h2>
                  <p className="mt-0.5 text-sm text-sky-700/75 dark:text-sky-100/65">
                    {t("calendarHint")}
                  </p>
                </div>
              </div>
              {heatmapData.length === 0 && (
                <p className="mt-2 text-xs text-muted">{t("noDataPeriod")}</p>
              )}
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              {isLoading ? (
                <HeatmapSkeleton />
              ) : heatmapData.length > 0 ? (
                <div className="relative rounded-2xl border border-sky-200/20 bg-white/50 p-3 shadow-inner dark:border-sky-300/10 dark:bg-slate-950/20">
                  <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/15" />
                  <CalendarHeatmap
                    data={heatmapData}
                    startDate={calendarStart}
                    endDate={calendarEnd}
                    selectedDate={selectedDate}
                    onDayClick={handleDayClick}
                    locale={locale}
                    colorScheme="aurora"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-sky-200/20 bg-white/50 py-12 text-center text-muted dark:border-sky-300/10 dark:bg-slate-950/20">
                  <p>{t("noDataPeriod")}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Détails du jour sélectionné */}
      {selectedDate && (
        <section
          ref={dayDetailsRef}
          className="mt-8 scroll-mt-8 animate-fade-in-up"
          aria-labelledby="heatmap-day-details-title"
        >
          <HeatmapDayDetailsPanel
            selectedDate={selectedDate}
            locale={locale}
            onClose={() => setSelectedDate(null)}
            dayListens={dayListensData}
            isLoading={isLoadingDayListens}
            periodDailyAverage={
              stats && stats.averageListens > 0 ? stats.averageListens : null
            }
            periodMaxListens={stats?.maxListens ?? 0}
            periodMaxDayDate={
              stats?.maxDay ? toDateOnly(stats.maxDay.date) : null
            }
            emptyStateNoPlays={
              <EmptyState {...emptyStatePresets.noDayDetail} />
            }
          />
        </section>
      )}
    </>
  );
}

export default function HeatmapPage() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const selectedDateParam = searchParams.get("selectedDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}-${selectedDateParam}`;

  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<HeatmapPageFallback />}>
        <HeatmapContent key={filterKey} />
      </Suspense>
    </div>
  );
}
