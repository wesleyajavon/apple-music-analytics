/**
 * Images de démo pour le panneau auth (sign-in / sign-up).
 * Déposer des JPEG 640×640 (Spotify artist) dans public/brand/auth-artists/ :
 *   the-weeknd.jpg · bad-bunny.jpg · gims.jpg
 */
export const AUTH_PREVIEW_ARTISTS = [
  {
    name: "The Weeknd",
    imageSrc: "/brand/auth-artists/the-weeknd.jpg",
  },
  {
    name: "Bad Bunny",
    imageSrc: "/brand/auth-artists/bad-bunny.jpg",
  },
  {
    name: "GIMS",
    imageSrc: "/brand/auth-artists/gims.jpg",
  },
] as const;
