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
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SEARCH_FIELD,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
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
  chartTheme: _chartTheme,
  resolvedTheme: _resolvedTheme,
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
  chartTheme?: unknown;
  resolvedTheme?: string;
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
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
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
          className={`${DASHBOARD_SEARCH_FIELD} pr-10`}
        />
        {selectedEntityId || query ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition-colors hover:text-foreground"
            aria-label={clearLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <div>
          <p className={`${DASHBOARD_SECTION_EYEBROW} mb-1`}>
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
                <li key={item.id}>
                  <button
                    type="button"
                    id={`${suggestionListId}-${item.id}`}
                    ref={(el) => setOptionRef(item.id, el)}
                    role="option"
                    aria-selected={highlighted}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => onSelectEntity(item.id, item.label)}
                    className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} ${DASHBOARD_LIST_ROW_INTERACTIVE} flex-col items-start gap-0.5 ${
                      highlighted ? "bg-black/[0.04] dark:bg-white/[0.06]" : ""
                    }`}
                  >
                    <span className="flex items-start gap-3 text-sm font-medium text-foreground">
                      <Swords className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 break-words">{item.label}</span>
                    </span>
                    {item.subtitle ? (
                      <span className="pl-7 text-[13px] text-muted">{item.subtitle}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {selectedEntityId && (isEntityLoading || isEntityFetching) ? (
        <p className="text-[13px] text-muted">{loadingLabel}</p>
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
            <p className="text-[13px] text-muted">{t("rangeClamped")}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className={`${DASHBOARD_SECTION_TITLE} text-xl`}>{chartTitle}</h3>
            <DuetChartViewToggle value={chartView} onChange={onChartViewChange} />
          </div>

          {chartData.length === 0 ? (
            <EmptyState variant="startup" message={noDataTitle} description={noDataDescription} />
          ) : (
            <div>
              <DuetDualLineChart
                data={displayChartData}
                period={period}
                locale={locale}
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
