/**
 * Utility functions for date-based listening aggregations
 * Centralizes SQL aggregation logic to reduce duplication
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import {
  AggregatedListenDto,
  DailyListenDto,
  WeeklyListenDto,
  MonthlyListenDto,
} from "../../dto/listening";
import { executeDateAggregation, AggregationResult } from "./listening-aggregation-core";

/**
 * Helper function to group daily data by week
 */
function groupDailyIntoWeekly(
  dailyData: DailyListenDto[],
  weeklyAggregations: AggregationResult[]
): WeeklyListenDto[] {
  const dailyMap = new Map(dailyData.map(d => [d.date, d]));

  return weeklyAggregations.map((row) => {
    // For week aggregations, date is always a Date object
    const weekStart = row.date instanceof Date ? row.date : new Date(row.date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    // Extract daily breakdown for this week from the daily data
    const dailyBreakdown: DailyListenDto[] = [];
    const currentDate = new Date(weekStart);
    
    while (currentDate <= weekEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dailyData = dailyMap.get(dateStr);
      if (dailyData) {
        dailyBreakdown.push(dailyData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
      dailyBreakdown,
    };
  });
}

/**
 * Helper function to group daily data by month
 */
function groupDailyIntoMonthly(
  dailyData: DailyListenDto[],
  monthlyAggregations: AggregationResult[]
): MonthlyListenDto[] {
  const dailyMap = new Map(dailyData.map(d => [d.date, d]));

  return monthlyAggregations.map((row) => {
    // For month aggregations, date is always a string in format YYYY-MM
    const month = typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-");
    const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month

    // Extract daily breakdown for this month from the daily data
    const dailyBreakdown: DailyListenDto[] = [];
    const currentDate = new Date(monthStart);
    
    while (currentDate <= monthEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dailyData = dailyMap.get(dateStr);
      if (dailyData) {
        dailyBreakdown.push(dailyData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      month,
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
      dailyBreakdown,
    };
  });
}

/**
 * Agrège les écoutes par jour.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par jour avec le nombre d'écoutes, titres uniques et artistes uniques
 */
export async function getDailyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<DailyListenDto[]> {
  const result = await executeDateAggregation(startDate, endDate, 'day', userId);

  return result.map((row) => ({
    date: row.date as string,
    listens: row.listens,
    uniqueTracks: row.unique_tracks,
    uniqueArtists: row.unique_artists,
  }));
}

/**
 * Agrège les écoutes par semaine.
 * 
 * Les semaines commencent le lundi et se terminent le dimanche.
 * Inclut une décomposition quotidienne pour chaque semaine.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par semaine avec décomposition quotidienne
 */
export async function getWeeklyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<WeeklyListenDto[]> {
  // Récupérer toutes les données quotidiennes une seule fois
  const allDailyData = await getDailyAggregatedListens(startDate, endDate, userId);
  
  // Récupérer les agrégations hebdomadaires
  const weeklyAggregations = await executeDateAggregation(startDate, endDate, 'week', userId);

  // Grouper en semaines en mémoire
  return groupDailyIntoWeekly(allDailyData, weeklyAggregations);
}

/**
 * Agrège les écoutes par mois.
 * 
 * Inclut une décomposition quotidienne pour chaque mois.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par mois avec décomposition quotidienne
 */
export async function getMonthlyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<MonthlyListenDto[]> {
  // Récupérer toutes les données quotidiennes une seule fois
  const allDailyData = await getDailyAggregatedListens(startDate, endDate, userId);
  
  // Récupérer les agrégations mensuelles
  const monthlyAggregations = await executeDateAggregation(startDate, endDate, 'month', userId);

  // Grouper en mois en mémoire
  return groupDailyIntoMonthly(allDailyData, monthlyAggregations);
}

/**
 * Récupère les écoutes agrégées pour un type de période spécifique.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param period - Type de période ('day', 'week', ou 'month')
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées selon la période spécifiée
 */
export async function getAggregatedListens(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId?: string
): Promise<AggregatedListenDto[]> {
  switch (period) {
    case "day": {
      const daily = await getDailyAggregatedListens(startDate, endDate, userId);
      return daily.map((d) => ({
        date: d.date,
        count: d.listens,
        uniqueTracks: d.uniqueTracks,
        uniqueArtists: d.uniqueArtists,
      }));
    }
    case "week": {
      const weekly = await getWeeklyAggregatedListens(startDate, endDate, userId);
      return weekly.map((w) => ({
        date: w.weekStart,
        count: w.listens,
        uniqueTracks: w.uniqueTracks,
        uniqueArtists: w.uniqueArtists,
      }));
    }
    case "month": {
      const monthly = await getMonthlyAggregatedListens(startDate, endDate, userId);
      return monthly.map((m) => ({
        date: m.month,
        count: m.listens,
        uniqueTracks: m.uniqueTracks,
        uniqueArtists: m.uniqueArtists,
      }));
    }
  }
}

