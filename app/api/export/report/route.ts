import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { AnnualReportPDF, AnnualReportData } from "@/lib/components/pdf/annual-report";
import { getOverviewStats, getGenreDistribution } from "@/lib/services/listening/listening-stats";
import { getMonthlyAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
  extractOptionalInteger,
} from "@/lib/middleware/validation";
import { generateExportFilename } from "@/lib/utils/csv-utils";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/export/report:
 *   get:
 *     summary: Génère un rapport PDF annuel
 *     description: |
 *       Génère un rapport PDF complet avec les statistiques d'écoute pour une année donnée.
 *       Le rapport inclut : vue d'ensemble, genres musicaux, évolution mensuelle.
 *       Les données sont filtrées selon l'année fournie ou la période de dates.
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf]
 *           default: pdf
 *         description: Format d'export (actuellement seul PDF est supporté)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Année pour le rapport (optionnel, si non fourni utilise startDate/endDate)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601 (YYYY-MM-DD, optionnel)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601 (YYYY-MM-DD, optionnel)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Fichier PDF du rapport annuel
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf";

    // Vérifier que le format est supporté
    if (format !== "pdf") {
      return NextResponse.json(
        {
          error: "Format non supporté",
          message: `Le format "${format}" n'est pas supporté. Seul "pdf" est disponible.`,
        },
        { status: 400 }
      );
    }

    // Extraire les paramètres
    const year = extractOptionalInteger(request, "year", {
      min: 2000,
      max: 2100,
    });
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

    // Déterminer les dates pour le rapport
    let startDate: Date;
    let endDate: Date;
    let reportYear: number;

    if (year) {
      // Si une année est fournie, utiliser toute l'année
      reportYear = year;
      startDate = new Date(year, 0, 1); // 1er janvier
      endDate = new Date(year, 11, 31, 23, 59, 59, 999); // 31 décembre
    } else if (startDateObj && endDateObj) {
      // Si des dates sont fournies, les utiliser
      startDate = startDateObj;
      endDate = endDateObj;
      reportYear = startDate.getFullYear();
    } else {
      // Par défaut, utiliser l'année en cours
      const now = new Date();
      reportYear = now.getFullYear();
      startDate = new Date(reportYear, 0, 1);
      endDate = new Date(reportYear, 11, 31, 23, 59, 59, 999);
    }

    // Récupérer toutes les données nécessaires en parallèle
    const [overviewStats, genreCounts, monthlyData] = await Promise.all([
      getOverviewStats(startDate, endDate, userId),
      getGenreDistribution(startDate, endDate, userId),
      getMonthlyAggregatedListens(startDate, endDate, userId),
    ]);

    // Calculer les pourcentages pour les genres
    const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
    const genres = genreCounts.map((item) => ({
      genre: item.genre,
      count: item.count,
      percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
    }));

    // Préparer les données pour le PDF
    const reportData: AnnualReportData = {
      year: reportYear,
      overview: {
        totalListens: overviewStats.totalListens,
        uniqueArtists: overviewStats.uniqueArtists,
        uniqueTracks: overviewStats.uniqueTracks,
        totalPlayTime: overviewStats.totalPlayTime,
      },
      genres,
      topGenres: genres.slice(0, 10), // Top 10 genres
      timeline: {
        monthly: monthlyData.map((item) => ({
          date: item.month,
          listens: item.listens,
          uniqueTracks: item.uniqueTracks,
          uniqueArtists: item.uniqueArtists,
        })),
      },
    };

    // Générer le PDF
    const pdfStream = await renderToStream(
      React.createElement(AnnualReportPDF, { data: reportData })
    );

    // Convertir le stream en buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Générer le nom de fichier avec timestamp
    const filename = generateExportFilename(`rapport_${reportYear}`, "pdf");

    // Retourner le PDF avec les bons headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/export/report" });
  }
}
