/**
 * Pochettes d'albums de démo pour la page d'accueil.
 * Les 5 premières alimentent « What stays in your rotation ».
 * Déposer des JPEG 640×640 (Spotify album) dans public/brand/home-albums/ :
 *   npx tsx scripts/download-home-album-images.ts
 */
export const HOME_PREVIEW_ALBUMS = [
  {
    name: "When We All Fall Asleep, Where Do We Go?",
    artist: "Billie Eilish",
    imageSrc: "/brand/home-albums/when-we-all-fall-asleep.jpg",
  },
  {
    name: "Views",
    artist: "Drake",
    imageSrc: "/brand/home-albums/views.jpg",
  },
  {
    name: "Midnights",
    artist: "Taylor Swift",
    imageSrc: "/brand/home-albums/midnights.jpg",
  },
  {
    name: "After Hours",
    artist: "The Weeknd",
    imageSrc: "/brand/home-albums/after-hours.jpg",
  },
  {
    name: "Un Verano Sin Ti",
    artist: "Bad Bunny",
    imageSrc: "/brand/home-albums/un-verano-sin-ti.jpg",
  },
  {
    name: "Blonde",
    artist: "Frank Ocean",
    imageSrc: "/brand/home-albums/blonde.jpg",
  },
  {
    name: "In Rainbows",
    artist: "Radiohead",
    imageSrc: "/brand/home-albums/in-rainbows.jpg",
  },
  {
    name: "22, A Million",
    artist: "Bon Iver",
    imageSrc: "/brand/home-albums/22-a-million.jpg",
  },
  {
    name: "Random Access Memories",
    artist: "Daft Punk",
    imageSrc: "/brand/home-albums/random-access-memories.jpg",
  },
  {
    name: "Rumours",
    artist: "Fleetwood Mac",
    imageSrc: "/brand/home-albums/rumours.jpg",
  },
  {
    name: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    imageSrc: "/brand/home-albums/to-pimp-a-butterfly.jpg",
  },
] as const;
