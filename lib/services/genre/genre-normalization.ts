import genreNormalization from "@/lib/data/genre-normalization.json";

export type GenreNormalizationFile = {
  version: number;
  description?: string;
  groups: Array<{ canonical: string; aliases: string[] }>;
};

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Construit une map alias (minuscule) → libellé canonique à partir du JSON.
 * Le canonical lui-même est aussi une entrée (identité).
 */
export function buildAliasToCanonicalMap(
  data: GenreNormalizationFile
): Map<string, string> {
  const map = new Map<string, string>();
  const seen = new Map<string, string>();

  for (const g of data.groups) {
    const canonical = g.canonical.trim();
    const keys = new Set<string>();
    keys.add(normKey(canonical));
    for (const a of g.aliases) {
      keys.add(normKey(a));
    }
    for (const k of keys) {
      if (seen.has(k) && seen.get(k) !== canonical) {
        throw new Error(
          `Conflit de normalisation : la clé "${k}" mappe à "${seen.get(k)}" et "${canonical}"`
        );
      }
      seen.set(k, canonical);
      map.set(k, canonical);
    }
  }
  return map;
}

let cachedMap: Map<string, string> | null = null;

export function getGenreNormalizationMap(): Map<string, string> {
  if (!cachedMap) {
    cachedMap = buildAliasToCanonicalMap(genreNormalization as GenreNormalizationFile);
  }
  return cachedMap;
}

/**
 * Retourne le libellé canonique si une correspondance existe, sinon la chaîne d’origine (trim).
 * `null` / vide → `null`.
 */
export function normalizeGenreLabel(
  genre: string | null | undefined
): string | null {
  if (genre == null || typeof genre !== "string") {
    return null;
  }
  const trimmed = genre.trim();
  if (!trimmed) {
    return null;
  }
  const map = getGenreNormalizationMap();
  const key = normKey(trimmed);
  return map.get(key) ?? trimmed;
}
