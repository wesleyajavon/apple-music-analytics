/**
 * Scopes demandés au login Spotify (Supabase OAuth) pour la Web API utilisateur.
 * Une seule source de vérité pour sign-in et persistance `SpotifyConnection.scope`.
 */
export const SPOTIFY_WEB_API_OAUTH_SCOPES =
  "user-read-email user-read-private user-read-recently-played user-top-read";
