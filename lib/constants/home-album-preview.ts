/**
 * Pochettes d'albums de démo pour la page d'accueil.
 * Déposer des JPEG 640×640 (Spotify album) dans public/brand/home-albums/ :
 *   abbey-road · thriller · dark-side · nevermind · back-in-black
 */
export const HOME_PREVIEW_ALBUMS = [
  {
    name: "Abbey Road",
    artist: "The Beatles",
    imageSrc: "/brand/home-albums/abbey-road.jpg",
  },
  {
    name: "Thriller",
    artist: "Michael Jackson",
    imageSrc: "/brand/home-albums/thriller.jpg",
  },
  {
    name: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    imageSrc: "/brand/home-albums/dark-side.jpg",
  },
  {
    name: "Nevermind",
    artist: "Nirvana",
    imageSrc: "/brand/home-albums/nevermind.jpg",
  },
  {
    name: "Back in Black",
    artist: "AC/DC",
    imageSrc: "/brand/home-albums/back-in-black.jpg",
  },
] as const;
