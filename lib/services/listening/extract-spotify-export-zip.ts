import JSZip from "jszip";

/**
 * Extrait le texte des fichiers Streaming_History_Audio_YYYY.json présents dans le ZIP Spotify
 * (ex. my_spotify_data.zip), quel que soit le dossier parent dans l’archive.
 */
export async function extractSpotifyStreamingHistoryJsonTextsFromZip(
  buffer: Buffer
): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const texts: string[] = [];

  const entries = Object.keys(zip.files);
  for (const path of entries) {
    const file = zip.files[path];
    if (!file || file.dir) continue;
    const base = path.split("/").pop() ?? "";
    if (!/^Streaming_History_Audio_\d{4}\.json$/i.test(base)) continue;
    const text = await file.async("string");
    texts.push(text);
  }

  return texts;
}
