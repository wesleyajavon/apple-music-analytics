import { AppError, ErrorCodes } from "@/lib/utils/error-handler";
import { parseSpotifyApiErrorMessage, spotifyFetchJson } from "@/lib/services/spotify/spotify-http";

export type SpotifyMe = {
  id: string;
  display_name?: string | null;
  email?: string | null;
};

export async function fetchSpotifyMe(accessToken: string): Promise<SpotifyMe> {
  const out = await spotifyFetchJson<SpotifyMe>("/me", accessToken);
  if (!out.ok) {
    throw new AppError(
      out.status === 401 || out.status === 403 ? 401 : 502,
      parseSpotifyApiErrorMessage(out.bodyText) ?? `Spotify /me HTTP ${out.status}`,
      out.status === 401 || out.status === 403
        ? ErrorCodes.UNAUTHORIZED
        : ErrorCodes.EXTERNAL_API_ERROR
    );
  }
  if (!out.data?.id) {
    throw new AppError(
      502,
      "Spotify /me response missing user id",
      ErrorCodes.EXTERNAL_API_ERROR
    );
  }
  return out.data;
}
