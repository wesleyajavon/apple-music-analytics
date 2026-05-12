type SpotifyJsonError = {
  error?: { status?: number; message?: string };
};

export async function spotifyFetchJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; bodyText: string }> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const bodyText = await res.text();

  if (!res.ok) {
    return { ok: false, status: res.status, bodyText };
  }

  try {
    const data = JSON.parse(bodyText) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: res.status, bodyText };
  }
}

export function parseSpotifyApiErrorMessage(bodyText: string): string | undefined {
  try {
    const j = JSON.parse(bodyText) as SpotifyJsonError;
    return j.error?.message;
  } catch {
    return undefined;
  }
}

/**
 * User-facing detail when Spotify returns a non-2xx body (JSON error message, or short plain/HTML snippet).
 */
export function formatSpotifyApiFailureDetail(
  status: number,
  bodyText: string,
  maxLen = 800
): string {
  const parsed = parseSpotifyApiErrorMessage(bodyText)?.trim();
  if (parsed) return parsed;

  const trimmed = bodyText.trim();
  if (!trimmed) return `HTTP ${status}`;

  if (trimmed.includes("<!DOCTYPE") || trimmed.toLowerCase().includes("<html")) {
    return `HTTP ${status} (Spotify returned HTML, not JSON — often a gateway or temporary outage)`;
  }

  const slice = trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
  return slice;
}
