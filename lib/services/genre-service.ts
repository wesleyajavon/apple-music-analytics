/**
 * Service centralisé pour le mapping des artistes vers les genres
 * À remplacer par une vraie API de genres (Last.fm, MusicBrainz, etc.) dans le futur
 */

/**
 * Mapping simplifié des artistes vers les genres
 */
export const ARTIST_TO_GENRE_MAP: Record<string, string> = {
  "The Weeknd": "R&B",
  "Dua Lipa": "Pop",
  "Taylor Swift": "Pop",
  "Arctic Monkeys": "Indie Rock",
  "Kendrick Lamar": "Hip-Hop",
  "Daft Punk": "Electronic",
  "Bon Iver": "Indie Folk",
  "Beach House": "Dream Pop",
  // Ajoutez plus de mappings selon vos besoins
};

/**
 * Fonction helper pour obtenir le genre d'un artiste
 * Retourne "Unknown" si l'artiste n'est pas dans le mapping
 */
export function getGenreForArtist(artistName: string): string {
  return ARTIST_TO_GENRE_MAP[artistName] || "Unknown";
}



