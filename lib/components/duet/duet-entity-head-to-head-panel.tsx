"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Search, Swords, X } from "lucide-react";
import {
  DuetDualLineChart,
  EntityBattleScorecard,
  applyDuetChartView,
  type DualLineChartPoint,
  type DuetChartViewMode,
} from "@/lib/components/duet/duet-entity-duel-blocks";
import { DuetChartViewToggle } from "@/lib/components/duet/duet-chart-view-toggle";
import type { PeriodType } from "@/lib/components/period-selector";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import type { DuetArenaMode } from "@/lib/components/duet/duet-battle-arena-ui";
import {
  DASHBOARD_CHART_THEME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
} from "@/lib/constants/dashboard-spotlight";
import type { CompareEntityResponse } from "@/lib/dto/duet";
import { ApiError } from "@/lib/api-client";

export type EntitySuggestion = { id: string; label: string; subtitle?: string };

export function EntityHeadToHeadPanel({
  searchPlaceholder,
  clearLabel,
  loadingLabel,
  errorLabel,
  chartTitle,
  chartDescription,
  chartDescriptionCumulative,
  noDataTitle,
  noDataDescription,
  query,
  onQueryChange,
  selectedEntityId,
  onSelectEntity,
  onClear,
  suggestions,
  showSuggestions,
  entityCompare,
  isEntityLoading,
  isEntityFetching,
  entityError,
  refetchEntity,
  chartData,
  entityDisplayName,
  entitySubtitle,
  entityImageUrl,
  arenaMode,
  viewerName,
  friendName,
  viewerAvatarUrl,
  friendAvatarUrl,
  locale,
  period,
  t,
  chartTheme,
  resolvedTheme,
  chartView,
  onChartViewChange,
}: {
  searchPlaceholder: string;
  clearLabel: string;
  loadingLabel: string;
  errorLabel: string;
  chartTitle: string;
  chartDescription: string;
  chartDescriptionCumulative: string;
  noDataTitle: string;
  noDataDescription: string;
  query: string;
  onQueryChange: (value: string) => void;
  selectedEntityId?: string;
  onSelectEntity: (id: string, label: string) => void;
  onClear: () => void;
  suggestions: EntitySuggestion[];
  showSuggestions: boolean;
  entityCompare?: CompareEntityResponse;
  isEntityLoading: boolean;
  isEntityFetching: boolean;
  entityError: Error | null;
  refetchEntity: () => void;
  chartData: DualLineChartPoint[];
  entityDisplayName: string;
  entitySubtitle?: string;
  entityImageUrl?: string | null;
  arenaMode: DuetArenaMode;
  viewerName: string;
  friendName: string;
  viewerAvatarUrl?: string | null;
  friendAvatarUrl?: string | null;
  locale: string;
  period: PeriodType;
  t: ReturnType<typeof useTranslations<"duet.compare">>;
  chartTheme: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
  resolvedTheme: string;
  chartView: DuetChartViewMode;
  onChartViewChange: (mode: DuetChartViewMode) => void;
}) {
  const displayChartData = useMemo(
    () => applyDuetChartView(chartData, chartView),
    [chartData, chartView]
  );
  const [highlightIndex, setHighlightIndex] = useState(0);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const skipSuggestionScrollRef = useRef(true);
  const suggestionListId = `duet-entity-suggestions-${arenaMode}`;
  const clampedHighlight =
    suggestions.length === 0 ? 0 : Math.min(highlightIndex, suggestions.length - 1);
  const activeSuggestion = showSuggestions ? suggestions[clampedHighlight] : undefined;

  useEffect(() => {
    setHighlightIndex(0);
    skipSuggestionScrollRef.current = true;
  }, [query]);

  useEffect(() => {
    if (!showSuggestions || !activeSuggestion) return;
    if (skipSuggestionScrollRef.current) {
      skipSuggestionScrollRef.current = false;
      return;
    }
    optionRefs.current.get(activeSuggestion.id)?.scrollIntoView({ block: "nearest" });
  }, [activeSuggestion, showSuggestions]);

  const setOptionRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) optionRefs.current.set(id, el);
    else optionRefs.current.delete(id);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (event.key === "Escape" && (query || selectedEntityId)) {
          event.preventDefault();
          onClear();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((index) => Math.min(index + 1, suggestions.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setHighlightIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setHighlightIndex(suggestions.length - 1);
        return;
      }
      if (event.key === "Enter") {
        const selected = suggestions[clampedHighlight];
        if (!selected) return;
        event.preventDefault();
        onSelectEntity(selected.id, selected.label);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onClear();
      }
    },
    [
      clampedHighlight,
      onClear,
      onSelectEntity,
      query,
      selectedEntityId,
      showSuggestions,
      suggestions,
    ]
  );

  return (
    <div className="space-y-4">
      <div className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
        <Search
          className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-10"
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={suggestionListId}
          aria-activedescendant={
            activeSuggestion ? `${suggestionListId}-${activeSuggestion.id}` : undefined
          }
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200/60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:border-violet-400/40 dark:focus:ring-violet-400/20"
        />
        {selectedEntityId || query ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 sm:right-10"
            aria-label={clearLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/5 dark:text-slate-400">
            {t("searchResultsCount", { count: suggestions.length })}
          </p>
          <ul
            id={suggestionListId}
            role="listbox"
            aria-label={t("searchSuggestionsLabel")}
            className="max-h-[min(60vh,24rem)] overflow-y-auto overscroll-contain"
          >
            {suggestions.map((item, index) => {
              const highlighted = index === clampedHighlight;
              return (
                <li key={item.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <button
                    type="button"
                    id={`${suggestionListId}-${item.id}`}
                    ref={(el) => setOptionRef(item.id, el)}
                    role="option"
                    aria-selected={highlighted}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => onSelectEntity(item.id, item.label)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm transition-colors ${
                      highlighted
                        ? "bg-violet-50 dark:bg-violet-500/15"
                        : "hover:bg-violet-50 dark:hover:bg-violet-500/10"
                    }`}
                  >
                    <span className="flex items-start gap-3 font-medium text-slate-900 dark:text-white">
                      <Swords
                        className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-300"
                        aria-hidden
                      />
                      <span className="min-w-0 break-words">{item.label}</span>
                    </span>
                    {item.subtitle ? (
                      <span className="pl-7 text-xs text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {selectedEntityId && (isEntityLoading || isEntityFetching) ? (
        <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{loadingLabel}</p>
      ) : null}

      {selectedEntityId && entityError ? (
        entityError instanceof ApiError &&
        (entityError.statusCode === 403 || entityError.statusCode === 404) ? (
          <EmptyState
            variant="startup"
            message={
              entityError.statusCode === 403 ? t("scopeInsufficientTitle") : t("notFoundTitle")
            }
            description={
              entityError.statusCode === 403
                ? t("scopeInsufficientDescription")
                : t("notFoundDescription")
            }
          />
        ) : (
          <ErrorState
            variant="startup"
            error={entityError}
            message={errorLabel}
            onRetry={() => refetchEntity()}
          />
        )
      ) : null}

      {selectedEntityId && entityCompare && !isEntityLoading && !isEntityFetching && !entityError ? (
        <div className="space-y-5">
          <EntityBattleScorecard
            selfCount={entityCompare.selfCount}
            friendCount={entityCompare.friendCount}
            viewerName={viewerName}
            friendName={friendName}
            viewerAvatarUrl={viewerAvatarUrl}
            friendAvatarUrl={friendAvatarUrl}
            winner={entityCompare.winner}
            entityName={entityDisplayName}
            entitySubtitle={entitySubtitle}
            entityImageUrl={entityImageUrl}
            arenaMode={arenaMode}
            locale={locale}
            t={t}
          />

          {entityCompare.rangeClamped ? (
            <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("rangeClamped")}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{chartTitle}</h3>
              <p className={`mt-1 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                {chartView === "cumulative" ? chartDescriptionCumulative : chartDescription}
              </p>
            </div>
            <DuetChartViewToggle value={chartView} onChange={onChartViewChange} />
          </div>

          {chartData.length === 0 ? (
            <EmptyState variant="startup" message={noDataTitle} description={noDataDescription} />
          ) : (
            <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
              <DuetDualLineChart
                data={displayChartData}
                period={period}
                locale={locale}
                chartTheme={chartTheme}
                resolvedTheme={resolvedTheme}
                selfLabel={t("seriesSelf")}
                friendLabel={t("seriesFriend", { friendName })}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
