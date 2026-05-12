import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";
import {
  decryptSpotifySecret,
  encryptSpotifySecret,
} from "@/lib/services/spotify/token-crypto";
import { refreshSpotifyAccessToken } from "@/lib/services/spotify/refresh-access-token";

const EXPIRY_BUFFER_MS = 90_000;

export async function getValidSpotifyAccessTokenForUser(userId: string): Promise<{
  accessToken: string;
  connectionId: string;
}> {
  const row = await prisma.spotifyConnection.findFirst({
    where: { userId, revokedAt: null },
  });

  if (!row) {
    throw new AppError(
      404,
      "No Spotify connection for this account. Sign in with Spotify first.",
      ErrorCodes.NOT_FOUND
    );
  }

  const now = Date.now();
  const expiresMs = row.expiresAt.getTime();

  if (expiresMs > now + EXPIRY_BUFFER_MS) {
    return {
      accessToken: decryptSpotifySecret(row.accessTokenEncrypted),
      connectionId: row.id,
    };
  }

  if (!row.refreshTokenEncrypted) {
    throw new AppError(
      401,
      "Spotify access expired and no refresh token is stored. Sign in with Spotify again.",
      ErrorCodes.UNAUTHORIZED
    );
  }

  const refreshPlain = decryptSpotifySecret(row.refreshTokenEncrypted);
  const refreshed = await refreshSpotifyAccessToken(refreshPlain);

  const newRefreshEnc = refreshed.refreshToken
    ? encryptSpotifySecret(refreshed.refreshToken)
    : row.refreshTokenEncrypted;

  await prisma.spotifyConnection.update({
    where: { id: row.id },
    data: {
      accessTokenEncrypted: encryptSpotifySecret(refreshed.accessToken),
      refreshTokenEncrypted: newRefreshEnc,
      expiresAt: new Date(Date.now() + refreshed.expiresInSec * 1000),
      ...(refreshed.scope ? { scope: refreshed.scope } : {}),
    },
  });

  return {
    accessToken: refreshed.accessToken,
    connectionId: row.id,
  };
}
