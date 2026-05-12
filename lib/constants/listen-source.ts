/**
 * Valeurs persistées dans Listen.source (Prisma String).
 * Étendre ici et dans les schémas Zod / OpenAPI en même temps.
 */
export const LISTEN_RECORD_SOURCES = [
  "lastfm",
  "apple_music_replay",
  "spotify_export",
  "spotify_web_api",
  "apple_music_export",
] as const;

export type ListenRecordSource = (typeof LISTEN_RECORD_SOURCES)[number];

export function isListenRecordSource(s: string): s is ListenRecordSource {
  return (LISTEN_RECORD_SOURCES as readonly string[]).includes(s);
}
