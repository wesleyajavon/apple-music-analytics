import JSZip from "jszip";

/** Extended streaming history: année dans le nom de fichier (export classique). */
const RE_AUDIO_YEAR = /^Streaming_History_Audio_\d{4}\.json$/i;
/** Variante récente : morceaux numérotés (ex. StreamingHistory_music_0.json). */
const RE_MUSIC_INDEX = /^StreamingHistory_music_\d+\.json$/i;

function isSpotifyExtendedStreamingHistoryJsonBasename(base: string): boolean {
  return RE_AUDIO_YEAR.test(base) || RE_MUSIC_INDEX.test(base);
}

/**
 * Extrait le texte des fichiers JSON « Extended streaming history » présents dans le ZIP Spotify
 * (ex. my_spotify_data.zip), quel que soit le dossier parent dans l’archive.
 * Reconnaît Streaming_History_Audio_YYYY.json et StreamingHistory_music_N.json.
 */
export async function extractSpotifyStreamingHistoryJsonTextsFromZip(
  data: Buffer | Uint8Array | ArrayBuffer
): Promise<string[]> {
  const zip = await JSZip.loadAsync(data);
  const paths: string[] = [];

  const entries = Object.keys(zip.files);
  for (const path of entries) {
    const file = zip.files[path];
    if (!file || file.dir) continue;
    const base = path.split("/").pop() ?? "";
    if (!isSpotifyExtendedStreamingHistoryJsonBasename(base)) continue;
    paths.push(path);
  }

  paths.sort((a, b) => {
    const ba = a.split("/").pop() ?? "";
    const bb = b.split("/").pop() ?? "";
    return ba.localeCompare(bb, undefined, { numeric: true, sensitivity: "base" });
  });

  const texts: string[] = [];
  for (const path of paths) {
    const file = zip.files[path];
    if (!file || file.dir) continue;
    const text = await file.async("string");
    texts.push(text);
  }

  return texts;
}
