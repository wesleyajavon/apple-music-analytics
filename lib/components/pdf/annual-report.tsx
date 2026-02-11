/**
 * Template PDF pour le rapport annuel
 * Utilise @react-pdf/renderer pour générer un PDF stylisé
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Types pour les données du rapport
export interface AnnualReportData {
  year: number;
  overview: {
    totalListens: number;
    uniqueArtists: number;
    uniqueTracks: number;
    totalPlayTime: number; // en secondes
  };
  genres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  timeline: {
    monthly: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;
  };
  topGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
}

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #2563eb",
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  statCard: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 5,
    border: "1 solid #e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  genreList: {
    marginTop: 10,
  },
  genreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
    backgroundColor: "#f8fafc",
    borderRadius: 3,
  },
  genreName: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "600",
  },
  genreStats: {
    fontSize: 11,
    color: "#64748b",
  },
  timelineTable: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    fontWeight: "bold",
  },
  tableCell: {
    fontSize: 10,
    paddingHorizontal: 8,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
});

/** Messages traduits pour le rapport PDF (clés du namespace annualReport) */
export interface AnnualReportMessages {
  title: string;
  subtitle: string;
  overview: string;
  totalListens: string;
  uniqueArtists: string;
  uniqueTracks: string;
  totalPlayTime: string;
  genres: string;
  listens: string;
  monthlyEvolution: string;
  tableMonth: string;
  tableListens: string;
  tableArtists: string;
  tableTracks: string;
  footer: string;
}

/**
 * Formate les secondes en format lisible (locale pour unités si besoin)
 */
function formatTime(seconds: number, locale: string): string {
  if (seconds <= 0) return "0 min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Formate un nombre avec des séparateurs de milliers
 */
function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Formate une date de mois (YYYY-MM) en format lisible
 */
function formatMonth(monthStr: string, locale: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Composant principal du rapport annuel PDF
 * @react-pdf/renderer ne supporte pas les hooks React, donc locale et messages sont passés en props
 */
export function AnnualReportPDF({
  data,
  locale,
  messages,
}: {
  data: AnnualReportData;
  locale: string;
  messages: AnnualReportMessages;
}) {
  const formattedDate = new Date().toLocaleDateString(locale);
  const title = messages.title.replace("{year}", data.year.toString());
  const footer = messages.footer.replace("{date}", formattedDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{messages.subtitle}</Text>
        </View>

        {/* Statistiques globales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{messages.overview}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{messages.totalListens}</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.totalListens, locale)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{messages.uniqueArtists}</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.uniqueArtists, locale)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{messages.uniqueTracks}</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.uniqueTracks, locale)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{messages.totalPlayTime}</Text>
              <Text style={styles.statValue}>
                {formatTime(data.overview.totalPlayTime, locale)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top genres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{messages.genres}</Text>
          <View style={styles.genreList}>
            {data.topGenres.slice(0, 10).map((genre, index) => (
              <View key={index} style={styles.genreItem}>
                <Text style={styles.genreName}>{genre.genre}</Text>
                <Text style={styles.genreStats}>
                  {formatNumber(genre.count, locale)} {messages.listens} (
                  {genre.percentage.toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timeline mensuelle */}
        {data.timeline.monthly && data.timeline.monthly.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{messages.monthlyEvolution}</Text>
            <View style={styles.timelineTable}>
              {/* En-tête du tableau */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>{messages.tableMonth}</Text>
                <Text style={styles.tableCell}>{messages.tableListens}</Text>
                <Text style={styles.tableCell}>{messages.tableArtists}</Text>
                <Text style={styles.tableCell}>{messages.tableTracks}</Text>
              </View>
              {/* Lignes de données */}
              {data.timeline.monthly.map((month, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {formatMonth(month.date, locale)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.listens, locale)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.uniqueArtists, locale)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.uniqueTracks, locale)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pied de page */}
        <Text style={styles.footer} fixed>
          {footer}
        </Text>
      </Page>
    </Document>
  );
}
