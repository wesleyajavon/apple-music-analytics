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
