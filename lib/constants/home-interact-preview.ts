import { AUTH_PREVIEW_ARTISTS } from "@/lib/constants/auth-artist-preview";

export const HOME_DUET_PREVIEW_SELF_LISTENS = 847;
export const HOME_DUET_PREVIEW_FRIEND_LISTENS = 612;
export const HOME_DUET_PREVIEW_MARGIN =
  HOME_DUET_PREVIEW_SELF_LISTENS - HOME_DUET_PREVIEW_FRIEND_LISTENS;

export const HOME_DUET_PREVIEW_ARTIST_IMAGE =
  AUTH_PREVIEW_ARTISTS.find((artist) => artist.name === "Bad Bunny")?.imageSrc ??
  "/brand/auth-artists/bad-bunny.jpg";
