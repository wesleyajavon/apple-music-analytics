"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";

export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

interface CalendarHeatmapProps {
  data: HeatmapDataPoint[];
  startDate?: string;
  endDate?: string;
  selectedDate?: string | null;
  onDayClick?: (date: string, count: number) => void;
  locale?: string;
  colorScheme?: "github" | "aurora";
}

/**
 * Génère toutes les dates entre startDate et endDate
 */
function generateDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Trouve le niveau d'intensité (0-4) basé sur le nombre d'écoutes
 */
function getIntensityLevel(count: number, maxCount: number): number {
  if (maxCount === 0) return 0;
  if (count === 0) return 0;

  const percentage = count / maxCount;

  if (percentage >= 0.75) return 4;
  if (percentage >= 0.5) return 3;
  if (percentage >= 0.25) return 2;
  return 1;
}

/**
 * Formate une date en YYYY-MM-DD sans problème de fuseau horaire
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date pour l'affichage
 */
function formatDateForDisplay(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Obtient le nom du jour de la semaine (narrow, 1-2 chars)
 */
function getDayName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "narrow" }).substring(0, 2);
}

/**
 * Calcule le premier jour de la semaine (lundi)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste pour lundi = 1
  return new Date(d.setDate(diff));
}

/**
 * Composant de calendrier heatmap style GitHub
 * Affiche les jours d'une année avec une couleur selon l'intensité d'écoute
 */
export function CalendarHeatmap({
  data,
  startDate,
  endDate,
  selectedDate,
  onDayClick,
  locale: localeProp,
  colorScheme = "github",
}: CalendarHeatmapProps) {
  const defaultLocale = useLocale();
  const locale = localeProp ?? defaultLocale;
  const t = useTranslations("heatmap");
  const tCommon = useTranslations("common");

  // Créer un Map pour un accès rapide aux données par date
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((point) => {
      // Normaliser la date pour éviter les problèmes de format
      const normalizedDate = point.date.split("T")[0]; // Enlever l'heure si présente
      map.set(normalizedDate, point.count);
    });
    return map;
  }, [data]);

  // Calculer les dates d'affichage
  const { dates, maxCount } = useMemo(() => {
    // Utiliser les dates fournies ou calculer des dates par défaut (1 an en arrière)
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Par défaut : 1 an en arrière jusqu'à aujourd'hui
      end = new Date();
      start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setMonth(0, 1); // 1er janvier de l'année précédente
    }

    // S'assurer que start est un lundi (début de semaine)
    const startMonday = getStartOfWeek(start);
    // S'assurer que end est un dimanche (fin de semaine)
    const endDay = end.getDay();
    const endSunday = new Date(end);
    if (endDay !== 0) {
      // Si ce n'est pas déjà dimanche, aller au dimanche suivant
      endSunday.setDate(end.getDate() + (7 - endDay));
    }

    const allDates = generateDates(startMonday, endSunday);

    // Calculer le max count, avec un minimum de 1 pour éviter la division par zéro
    const max = data.length > 0 ? Math.max(...data.map((d) => d.count), 1) : 1;

    return { dates: allDates, maxCount: max };
  }, [startDate, endDate, data]);

  // Organiser les dates par semaine (lundi à dimanche)
  const weeks = useMemo(() => {
    const weeksData: Date[][] = [];

    // Parcourir les dates et les grouper par semaine
    for (let i = 0; i < dates.length; i += 7) {
      const week = dates.slice(i, i + 7);
      // S'assurer que chaque semaine a 7 jours
      if (week.length === 7) {
        weeksData.push(week);
      } else {
        // Compléter la dernière semaine avec des dates vides si nécessaire
        while (week.length < 7) {
          const lastDate = week[week.length - 1];
          const nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + 1);
          week.push(nextDate);
        }
        weeksData.push(week);
      }
    }

    return weeksData;
  }, [dates]);

  // Labels des mois pour l'affichage - avec gestion des chevauchements
  const monthLabels = useMemo(() => {
    const labels: {
      weekIndex: number;
      label: string;
      month: number;
      year: number;
    }[] = [];
    let lastMonth = -1;
    let lastYear = -1;

    // Première passe : collecter tous les changements de mois
    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const firstDay = week[0];
        const month = firstDay.getMonth();
        const year = firstDay.getFullYear();

        if (month !== lastMonth || year !== lastYear) {
          labels.push({
            weekIndex,
            month,
            year,
            label: firstDay.toLocaleDateString(locale, {
              month: "short",
              year: year !== lastYear ? "numeric" : undefined,
            }),
          });
          lastMonth = month;
          lastYear = year;
        }
      }
    });

    // Deuxième passe : filtrer les labels trop proches (au moins 3 semaines d'écart)
    const MIN_WEEK_DISTANCE = 3;
    const filteredLabels: typeof labels = [];

    labels.forEach((label, index) => {
      if (index === 0) {
        // Toujours inclure le premier label
        filteredLabels.push(label);
      } else {
        const prevLabel = filteredLabels[filteredLabels.length - 1];
        const distance = label.weekIndex - prevLabel.weekIndex;

        if (distance >= MIN_WEEK_DISTANCE) {
          filteredLabels.push(label);
        } else if (index === labels.length - 1) {
          // Toujours inclure le dernier label si c'est le dernier
          filteredLabels.push(label);
        }
      }
    });

    return filteredLabels;
  }, [weeks, locale]);

  // Grouper les jours de la semaine (lundi = 0, dimanche = 6)
  const dayOfWeekGroups = useMemo(() => {
    const groups: Date[][] = [[], [], [], [], [], [], []];

    dates.forEach((date) => {
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Lundi = 0, Dimanche = 6
      groups[dayIndex].push(date);
    });

    return groups;
  }, [dates]);

  if (!dates || dates.length === 0) {
    return (
      <div className="w-full py-8 text-center text-muted">
        <p>{t("noDateToDisplay")}</p>
      </div>
    );
  }

  // Styles GitHub-like
  const SQUARE_SIZE = 11; // px - taille GitHub
  const SQUARE_GAP = 2; // px - espacement entre les carrés
  const WEEK_GAP = 2; // px - espacement entre les semaines (colonnes)
  const WEEK_WIDTH = SQUARE_SIZE + WEEK_GAP; // Largeur totale d'une semaine
  const intensityColors =
    colorScheme === "aurora"
      ? ["#ecfeff", "#a7f3d0", "#5eead4", "#38bdf8", "#8b5cf6"]
      : ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"];
  const outlineColor =
    colorScheme === "aurora"
      ? "rgba(14, 165, 233, 0.16)"
      : "rgba(27, 31, 35, 0.06)";
  const selectedOutline =
    colorScheme === "aurora" ? "2px solid rgb(56 189 248)" : "2px solid rgb(139 92 246)";
  const hoverShadow =
    colorScheme === "aurora"
      ? "0 0 0 2px rgba(56, 189, 248, 0.42), 0 0 18px -6px rgba(139, 92, 246, 0.72)"
      : "0 0 0 2px rgba(139, 92, 246, 0.4)";

  return (
    <div
      className="w-full"
      role="group"
      aria-label={t("calendarTitle")}
    >
      {/* Légende d'intensité - visible hors de la zone scrollable, façon GitHub. */}
      <div
        className="mb-3 flex items-center justify-end gap-1 text-xs text-muted"
        aria-label={`${t("legendLess")} - ${t("legendMore")}`}
      >
        <span className="mr-2 text-[10px] leading-none">{t("legendLess")}</span>
        <div className="flex gap-1" aria-hidden="true">
          {intensityColors.map((color) => (
            <div
              key={color}
              style={{
                width: "11px",
                height: "11px",
                backgroundColor: color,
                outline: `1px solid ${outlineColor}`,
                outlineOffset: "-1px",
                borderRadius: "2px",
              }}
            />
          ))}
        </div>
        <span className="ml-2 text-[10px] leading-none">{t("legendMore")}</span>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <div className="inline-block">
        {/* Calendrier - structure GitHub */}
        <div className="flex items-start" style={{ gap: "4px" }}>
          {/* Labels des jours de la semaine - à gauche, alignés avec les carrés */}
          {/* Le paddingTop doit correspondre exactement à la hauteur des labels de mois + un petit espace */}
          <div
            className="flex flex-col"
            style={{
              paddingTop: "18px",
              gap: `${SQUARE_GAP}px`,
              width: "15px",
              flexShrink: 0,
            }}
          >
            {[
              new Date(2024, 0, 7), // Sun
              new Date(2024, 0, 1), // Mon
              new Date(2024, 0, 2), // Tue
              new Date(2024, 0, 3), // Wed
              new Date(2024, 0, 4), // Thu
              new Date(2024, 0, 5), // Fri
              new Date(2024, 0, 6), // Sat
            ].map((d, index) => (
              <div
                key={index}
                className="text-right text-xs leading-none text-muted"
                style={{
                  width: "15px",
                  height: `${SQUARE_SIZE}px`,
                  lineHeight: `${SQUARE_SIZE}px`,
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {getDayName(d, locale)}
              </div>
            ))}
          </div>

          {/* Zone calendrier avec mois et semaines */}
          <div
            className="relative"
            style={{ minWidth: `${weeks.length * WEEK_WIDTH}px` }}
          >
            {/* Labels des mois en haut */}
            {monthLabels.length > 0 && (
              <div
                className="absolute top-0 left-0 w-full"
                style={{
                  height: "17px",
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                {monthLabels.map(({ weekIndex, label }, index) => {
                  const leftPosition = weekIndex * WEEK_WIDTH;
                  // Calculer la position du label suivant pour éviter les chevauchements
                  const nextLabel = monthLabels[index + 1];
                  const nextPosition = nextLabel
                    ? nextLabel.weekIndex * WEEK_WIDTH
                    : Infinity;
                  const labelWidth = 45; // Estimation de la largeur du label (pour "nov." ou "déc. 2025")

                  // Si le label suivant est trop proche, masquer ce label
                  const shouldShow =
                    !nextLabel || nextPosition - leftPosition >= labelWidth;

                  return (
                    <div
                      key={`${weekIndex}-${label}`}
                      className="absolute text-xs text-muted"
                      style={{
                        left: `${leftPosition}px`,
                        fontSize: "10px",
                        top: "0px",
                        opacity: shouldShow ? 1 : 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Semaines (colonnes verticales) */}
            <div
              className="flex"
              style={{ marginTop: "18px", gap: `${WEEK_GAP}px` }}
            >
              {weeks.length > 0 ? (
                weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="flex flex-col flex-shrink-0"
                    style={{ gap: `${SQUARE_GAP}px` }}
                  >
                    {week.map((date, dayIndex) => {
                      // Formater la date en utilisant UTC pour éviter les problèmes de fuseau horaire
                      const dateStr = formatDateString(date);
                      const count = dataMap.get(dateStr) || 0;
                      const intensity = getIntensityLevel(count, maxCount);

                      // Comparer les dates en utilisant UTC pour éviter les décalages
                      const today = new Date();
                      const todayStr = formatDateString(today);
                      const isFuture = dateStr > todayStr;
                      const isSelected = selectedDate === dateStr;

                      const getHeatmapStyle = () => ({
                        backgroundColor: intensityColors[intensity],
                        outline: `1px solid ${outlineColor}`,
                        outlineOffset: "-1px",
                      });

                      return (
                        <div
                          key={dateStr}
                          className="cursor-pointer transition-all relative"
                          style={{
                            width: `${SQUARE_SIZE}px`,
                            height: `${SQUARE_SIZE}px`,
                            borderRadius: "2px", // GitHub utilise des coins légèrement arrondis
                            ...getHeatmapStyle(),
                            opacity: isFuture ? 0.25 : 1,
                            cursor:
                              isFuture || count === 0 ? "default" : "pointer",
                            transition: "all 0.1s ease",
                            ...(isSelected && {
                              outline: selectedOutline,
                              outlineOffset: "2px",
                              zIndex: 20,
                            }),
                          }}
                          title={
                            count > 0
                              ? `${formatDateForDisplay(date, locale)}: ${count.toLocaleString(locale)} ${count > 1 ? t("listens") : t("listen")}`
                              : `${formatDateForDisplay(date, locale)}: ${t("noListen")}`
                          }
                          onClick={(e) => {
                            if (!isFuture && count > 0 && onDayClick) {
                              e.preventDefault();
                              e.stopPropagation();
                              onDayClick(dateStr, count);
                            }
                          }}
                          role={count > 0 && !isFuture ? "button" : undefined}
                          tabIndex={isFuture || count === 0 ? -1 : 0}
                          onKeyDown={(e) => {
                            if (
                              (e.key === "Enter" || e.key === " ") &&
                              !isFuture &&
                              count > 0
                            ) {
                              e.preventDefault();
                              onDayClick?.(dateStr, count);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!isFuture && count > 0) {
                              e.currentTarget.style.transform = "scale(1.15)";
                              e.currentTarget.style.zIndex = "10";
                              e.currentTarget.style.boxShadow = hoverShadow;
                            } else if (!isFuture && count === 0) {
                              e.currentTarget.style.cursor = "default";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.zIndex = "auto";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                          aria-label={
                            count > 0
                              ? `${formatDateForDisplay(date, locale)}: ${count.toLocaleString(locale)} ${count > 1 ? t("listens") : t("listen")} - ${t("ariaListenCount")}`
                              : `${formatDateForDisplay(date, locale)}: ${t("noListen")}`
                          }
                        />
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="py-4 text-sm text-muted">
                  {t("noDataToDisplay")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
