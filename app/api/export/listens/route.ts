import { NextRequest, NextResponse } from "next/server";
import { getAllListensForExport } from "@/lib/services/listening/listening-service";
import { generateCsv, generateExportFilename } from "@/lib/utils/csv-utils";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
  extractOptionalString,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/export/listens:
 *   get:
 *     summary: Exporte les écoutes au format CSV
 *     description: |
 *       Exporte toutes les écoutes correspondant aux filtres appliqués au format CSV.
 *       Les colonnes incluent : Date, Artiste, Titre, Genre, Source.
 *       Les filtres de date et de source sont appliqués si fournis.
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv]
 *           default: csv
 *         description: Format d'export (actuellement seul CSV est supporté)
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
 *         name: source
 *         schema:
 *           type: string
 *           enum: [lastfm, apple_music_replay]
 *         description: Source des écoutes à exporter (optionnel)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Fichier CSV des écoutes
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *             example: |
 *               Date,Artiste,Titre,Genre,Source
 *               2024-01-15,Artist Name,Track Title,Rock,lastfm
 *               2024-01-14,Another Artist,Another Track,Pop,lastfm
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
    const format = searchParams.get("format") || "csv";

    // Vérifier que le format est supporté
    if (format !== "csv") {
      return NextResponse.json(
        {
          error: "Format non supporté",
          message: `Le format "${format}" n'est pas supporté. Seul "csv" est disponible.`,
        },
        { status: 400 }
      );
    }

    // Extraire les paramètres de filtrage
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);
    const source = extractOptionalString(request, "source") as
      | "lastfm"
      | "apple_music_replay"
      | undefined;

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
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/export/listens" });
  }
}
