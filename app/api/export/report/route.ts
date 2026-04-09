import { NextRequest, NextResponse } from "next/server";
import { renderToStream, DocumentProps } from "@react-pdf/renderer";
import React from "react";
import {
  AnnualReportPDF,
  AnnualReportData,
  AnnualReportMessages,
} from "@/lib/components/pdf/annual-report";
import { getOverviewStats, getGenreDistribution } from "@/lib/services/listening/listening-stats";
import { getMonthlyAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalInteger,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { generateExportFilename } from "@/lib/utils/csv-utils";
import { routing } from "@/i18n/routing";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

const VALID_LOCALES = routing.locales as readonly string[];

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

const EXPORT_REPORT_RATE_LIMIT = {
  route: "/api/export/report",
  windowMs: 60_000,
  maxRequests: 5,
} as const;

/**
 * @swagger
 * /api/export/report:
 *   get:
 *     summary: Generates an annual PDF report
 *     description: |
 *       Generates a complete PDF report with listening statistics for a given year.
 *       The report includes overview, genres, and monthly evolution.
 *       Data is filtered by the provided year or date range.
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf]
 *           default: pdf
 *         description: Export format (currently only PDF is supported)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *         description: Year for the report (optional, falls back to startDate/endDate if not provided)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (YYYY-MM-DD, optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (YYYY-MM-DD, optional)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           enum: [fr, en, es]
 *           default: fr
 *         description: Locale for PDF content (fr, en, es)
 *     responses:
 *       200:
 *         description: Annual report PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  let rateLimit: RateLimitResult | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf";

    // Vérifier que le format est supporté
    if (format !== "pdf") {
      return NextResponse.json(
        {
          error: "Unsupported format",
          message: `Format "${format}" is not supported. Only "pdf" is available.`,
        },
        { status: 400 }
      );
    }

    // Récupérer la locale pour le PDF (fr, en, es)
    const localeParam = extractOptionalString(request, "locale") || routing.defaultLocale;
    const locale = VALID_LOCALES.includes(localeParam) ? localeParam : routing.defaultLocale;

    // Charger les messages pour la locale
    const messagesModule = await import(`@/messages/${locale}.json`);
    const pdfMessages = messagesModule.default.annualReport as AnnualReportMessages;

    // Extraire les paramètres
    const year = extractOptionalInteger(request, "year", {
      min: 2000,
      max: 2100,
    });
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();
    rateLimit = await assertRateLimit(request, {
      ...EXPORT_REPORT_RATE_LIMIT,
      userId,
    });

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

    // Générer le PDF - créer l'élément avec data, locale et messages
    const pdfElement = React.createElement(AnnualReportPDF, {
      data: reportData,
      locale,
      messages: pdfMessages,
    });
    const pdfStream = await renderToStream(
      pdfElement as React.ReactElement<DocumentProps>
    );

    // Convertir le stream en buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // Le stream peut retourner des strings ou des Buffers
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf-8'));
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Générer le nom de fichier avec timestamp
    const filename = generateExportFilename(`rapport_${reportYear}`, "pdf");

    // Retourner le PDF avec les bons headers
    const response = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
    return applyRateLimitHeaders(response, rateLimit, EXPORT_REPORT_RATE_LIMIT);
  } catch (error) {
    const response = handleApiError(error, { route: "/api/export/report" });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, EXPORT_REPORT_RATE_LIMIT);
    }
    return response;
  }
}
