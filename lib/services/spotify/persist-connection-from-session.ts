import type { Session } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { SPOTIFY_WEB_API_OAUTH_SCOPES } from "@/lib/services/spotify/spotify-web-api-scopes";
import { fetchSpotifyMe } from "@/lib/services/spotify/spotify-me";
import {
  encryptSpotifySecret,
  isSpotifyTokenEncryptionConfigured,
} from "@/lib/services/spotify/token-crypto";
import { logger } from "@/lib/utils/logger";

/** Durée conservative du access token Spotify (~1 h) si Supabase ne fournit pas expires_in provider. */
const SPOTIFY_ACCESS_ASSUMED_MS = 55 * 60 * 1000;

export async function persistSpotifyConnectionFromSupabaseSession(
  session: Session
): Promise<void> {
  const identities = session.user.identities ?? [];
  const hasSpotify = identities.some((i) => i.provider === "spotify");
  if (!hasSpotify || !session.provider_token) return;

  if (!isSpotifyTokenEncryptionConfigured()) {
    logger.warn(
      "[spotify] SPOTIFY_TOKEN_ENCRYPTION_KEY missing; skipping Spotify token persistence"
    );
    return;
  }

  try {
    const me = await fetchSpotifyMe(session.provider_token);
    const expiresAt = new Date(Date.now() + SPOTIFY_ACCESS_ASSUMED_MS);

    await prisma.spotifyConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        spotifyUserId: me.id,
        spotifyDisplayName: me.display_name ?? null,
        spotifyEmail: me.email ?? null,
        accessTokenEncrypted: encryptSpotifySecret(session.provider_token),
        refreshTokenEncrypted: session.provider_refresh_token
          ? encryptSpotifySecret(session.provider_refresh_token)
          : null,
        scope: SPOTIFY_WEB_API_OAUTH_SCOPES,
        expiresAt,
      },
      update: {
        spotifyUserId: me.id,
        spotifyDisplayName: me.display_name ?? null,
        spotifyEmail: me.email ?? null,
        accessTokenEncrypted: encryptSpotifySecret(session.provider_token),
        ...(session.provider_refresh_token
          ? {
              refreshTokenEncrypted: encryptSpotifySecret(
                session.provider_refresh_token
              ),
            }
          : {}),
        scope: SPOTIFY_WEB_API_OAUTH_SCOPES,
        expiresAt,
        revokedAt: null,
      },
    });
  } catch (e) {
    logger.warn("[spotify] persist connection failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
