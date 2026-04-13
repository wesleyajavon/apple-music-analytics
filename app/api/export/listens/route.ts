import { NextRequest, NextResponse } from "next/server";
import { getAllListensForExport } from "@/lib/services/listening/listening-service";
import { generateCsv, generateExportFilename } from "@/lib/utils/csv-utils";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalString,
} from "@/lib/middleware/validation";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { isListenRecordSource } from "@/lib/constants/listen-source";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

const EXPORT_LISTENS_RATE_LIMIT = {
  route: "/api/export/listens",
  windowMs: 60_000,
  maxRequests: 10,
} as const;

/**
 * @swagger
 * /api/export/listens:
 *   get:
 *     summary: Exports listens in CSV format
 *     description: |
 *       Exports all listens matching the applied filters in CSV format.
 *       Columns include Date, Artist, Title, Genre, Source.
 *       Date and source filters are applied when provided.
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv]
 *           default: csv
 *         description: Export format (currently only CSV is supported)
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
 *         name: source
 *         schema:
 *           type: string
 *           enum: [lastfm, apple_music_replay, spotify_export, apple_music_export]
 *         description: Source of listens to export (optional)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Listens CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               Date,Artist,Title,Genre,Source
 *               2024-01-15,Artist Name,Track Title,Rock,lastfm
 *               2024-01-14,Another Artist,Another Track,Pop,lastfm
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
    const format = searchParams.get("format") || "csv";

    // Vérifier que le format est supporté
    if (format !== "csv") {
      return NextResponse.json(
        {
          error: "Unsupported format",
          message: `Format "${format}" is not supported. Only "csv" is available.`,
        },
        { status: 400 }
      );
    }

    // Extraire les paramètres de filtrage
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();
    rateLimit = await assertRateLimit(request, {
      ...EXPORT_LISTENS_RATE_LIMIT,
      userId,
    });
    const sourceRaw = extractOptionalString(request, "source");
    const source =
      sourceRaw && isListenRecordSource(sourceRaw) ? sourceRaw : undefined;

    // Convertir les dates en format ISO string pour le service
    const startDate = startDateObj?.toISOString().split("T")[0];
    const endDate = endDateObj?.toISOString().split("T")[0];

    // Récupérer toutes les écoutes avec genre
    const listens = await getAllListensForExport({
      startDate,
      endDate,
      userId,
      source,
    });

    // Définir les en-têtes CSV
    const headers = ["Date", "Artiste", "Titre", "Genre", "Source"];

    // Convertir les écoutes en lignes CSV
    const rows = listens.map((listen) => [
      listen.date,
      listen.artistName,
      listen.trackTitle,
      listen.genre || "", // Genre peut être null
      listen.source,
    ]);

    // Générer le CSV
    const csvContent = generateCsv(headers, rows);

    // Générer le nom de fichier avec timestamp
    const filename = generateExportFilename("listens", "csv");

    // Retourner le CSV avec les bons headers
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
    return applyRateLimitHeaders(response, rateLimit, EXPORT_LISTENS_RATE_LIMIT);
  } catch (error) {
    const response = handleApiError(error, { route: "/api/export/listens" });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, EXPORT_LISTENS_RATE_LIMIT);
    }
    return response;
  }
}
