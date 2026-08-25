-- Artist portraits are Spotify CDN only. Drop Last.fm / Replay / other leftover URLs.
UPDATE "Artist"
SET "imageUrl" = NULL
WHERE "imageUrl" IS NOT NULL
  AND "imageUrl" !~* '^https://([a-z0-9-]+\.)*scdn\.co/'
  AND "imageUrl" !~* '^https://([a-z0-9-]+\.)*spotifycdn\.com/';
