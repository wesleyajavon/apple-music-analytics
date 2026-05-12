import { AppError, ErrorCodes } from "@/lib/utils/error-handler";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export type RefreshedSpotifyTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresInSec: number;
  scope?: string;
};

export async function refreshSpotifyAccessToken(
  refreshToken: string
): Promise<RefreshedSpotifyTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new AppError(
      503,
      "SPOTIFY_CLIENT_ID is required to refresh Spotify tokens",
      ErrorCodes.INTERNAL_SERVER_ERROR
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    headers.Authorization =
      "Basic " + Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  } else {
    body.set("client_id", clientId);
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new AppError(
      res.status === 400 || res.status === 401 ? 401 : 502,
      `Spotify token refresh failed (${res.status})`,
      res.status === 400 || res.status === 401
        ? ErrorCodes.UNAUTHORIZED
        : ErrorCodes.EXTERNAL_API_ERROR,
      text.slice(0, 400)
    );
  }

  let parsed: SpotifyTokenResponse;
  try {
    parsed = JSON.parse(text) as SpotifyTokenResponse;
  } catch {
    throw new AppError(
      502,
      "Spotify token refresh returned invalid JSON",
      ErrorCodes.EXTERNAL_API_ERROR
    );
  }

  if (!parsed.access_token || !parsed.expires_in) {
    throw new AppError(
      502,
      "Spotify token refresh response incomplete",
      ErrorCodes.EXTERNAL_API_ERROR
    );
  }

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresInSec: parsed.expires_in,
    scope: parsed.scope,
  };
}
