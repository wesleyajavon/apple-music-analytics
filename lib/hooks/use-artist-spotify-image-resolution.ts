"use client";

import { useEffect, useState } from "react";

const inflight = new Map<string, Promise<string | null>>();

/**
 * Hydratation ponctuelle d’Artist.imageUrl (API Spotify côté serveur), avec dédoublonnage
 * lorsque plusieurs cartes montent en même temps pour le même artiste.
 */
async function hydrateArtistImageOnce(artistId: string): Promise<string | null> {
  const hit = inflight.get(artistId);
  if (hit) return hit;

  const p = (async () => {
    try {
      const res = await fetch(
        `/api/artists/${encodeURIComponent(artistId)}/image`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { imageUrl?: string | null };
      const u = body.imageUrl?.trim();
      return u || null;
    } catch {
      return null;
    }
  })().finally(() => {
    inflight.delete(artistId);
  });

  inflight.set(artistId, p);
  return p;
}

/** URL affichable : valeur initiale depuis l’API produit puis, si absente, résultat de POST hydrate. */
export function useArtistSpotifyImageResolution(
  artistDbId: string | undefined | null,
  initialImageUrl: string | null | undefined
): string | null {
  const id = artistDbId?.trim() ?? "";

  const [resolvedFromApi, setResolvedFromApi] = useState<string | null>(null);

  useEffect(() => {
    setResolvedFromApi(null);
  }, [id]);

  useEffect(() => {
    if (initialImageUrl?.trim()) return;
    if (!id) return;
    let alive = true;
    void hydrateArtistImageOnce(id).then((url) => {
      if (!alive || !url) return;
      setResolvedFromApi(url);
    });
    return () => {
      alive = false;
    };
  }, [id, initialImageUrl]);

  return initialImageUrl?.trim() || resolvedFromApi;
}
