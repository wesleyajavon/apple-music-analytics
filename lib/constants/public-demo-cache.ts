/** TTL et tag partagés pour toutes les réponses analytics « profil public » (démo). */
export const PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS = 60;

export function publicProfileAnalyticsCacheTag(publicUserId: string): string {
  return `public-profile-analytics:${publicUserId}`;
}
