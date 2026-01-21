/**
 * Utilitaires pour la génération de fichiers CSV
 */

/**
 * Échappe une valeur pour le format CSV
 * Gère les guillemets, les virgules et les retours à la ligne
 * 
 * @param value - Valeur à échapper
 * @returns Valeur échappée pour CSV
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  
  // Si la valeur contient des guillemets, des virgules ou des retours à la ligne, on l'entoure de guillemets
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    // Double les guillemets existants
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convertit un tableau de données en format CSV
 * 
 * @param headers - En-têtes des colonnes
 * @param rows - Lignes de données (tableau de tableaux)
 * @returns Chaîne CSV formatée
 * 
 * @example
 * ```typescript
 * const csv = generateCsv(
 *   ['Date', 'Artiste', 'Titre'],
 *   [
 *     ['2024-01-01', 'Artist Name', 'Track Title'],
 *     ['2024-01-02', 'Another Artist', 'Another Track']
 *   ]
 * );
 * ```
 */
export function generateCsv(headers: string[], rows: (string | null | undefined)[][]): string {
  // Ligne d'en-tête
  const headerLine = headers.map(escapeCsvValue).join(',');
  
  // Lignes de données
  const dataLines = rows.map(row => 
    row.map(escapeCsvValue).join(',')
  );
  
  // Combine toutes les lignes
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Génère un nom de fichier avec timestamp pour les exports
 * 
 * @param prefix - Préfixe du nom de fichier (ex: "listens")
 * @param extension - Extension du fichier (ex: "csv")
 * @returns Nom de fichier formaté
 * 
 * @example
 * ```typescript
 * const filename = generateExportFilename('listens', 'csv');
 * // Returns: "listens_2024-01-15_14-30-45.csv"
 * ```
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  return `${prefix}_${timestamp}.${extension}`;
}
