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

/**
 * Formate les secondes en format lisible
 */
function formatTime(seconds: number): string {
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
function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(num);
}

/**
 * Formate une date de mois (YYYY-MM) en format lisible
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Composant principal du rapport annuel PDF
 */
export function AnnualReportPDF({ data }: { data: AnnualReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Rapport Annuel {data.year}</Text>
          <Text style={styles.subtitle}>
            Analyse de vos habitudes d&apos;écoute musicale
          </Text>
        </View>

        {/* Statistiques globales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d&apos;ensemble</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total d&apos;écoutes</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.totalListens)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Artistes uniques</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.uniqueArtists)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Titres uniques</Text>
              <Text style={styles.statValue}>
                {formatNumber(data.overview.uniqueTracks)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Temps d&apos;écoute</Text>
              <Text style={styles.statValue}>
                {formatTime(data.overview.totalPlayTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top genres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genres musicaux</Text>
          <View style={styles.genreList}>
            {data.topGenres.slice(0, 10).map((genre, index) => (
              <View key={index} style={styles.genreItem}>
                <Text style={styles.genreName}>{genre.genre}</Text>
                <Text style={styles.genreStats}>
                  {formatNumber(genre.count)} écoutes ({genre.percentage.toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Timeline mensuelle */}
        {data.timeline.monthly && data.timeline.monthly.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Évolution mensuelle</Text>
            <View style={styles.timelineTable}>
              {/* En-tête du tableau */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Mois</Text>
                <Text style={styles.tableCell}>Écoutes</Text>
                <Text style={styles.tableCell}>Artistes</Text>
                <Text style={styles.tableCell}>Titres</Text>
              </View>
              {/* Lignes de données */}
              {data.timeline.monthly.map((month, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {formatMonth(month.date)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.listens)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.uniqueArtists)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatNumber(month.uniqueTracks)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pied de page */}
        <Text style={styles.footer} fixed>
          Généré le {new Date().toLocaleDateString("fr-FR")} - Apple Music
          Analytics Dashboard
        </Text>
      </Page>
    </Document>
  );
}
