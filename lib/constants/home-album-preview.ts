/**
 * Pochettes d'albums de démo pour la page d'accueil.
 * Les 5 premières alimentent « What stays in your rotation ».
 * Sources WebP 480×480 (légères) ; JPEG 640×640 conservés en fallback / regen :
 *   npx tsx scripts/download-home-album-images.ts
 */
export const HOME_PREVIEW_ALBUMS = [
  {
    name: "When We All Fall Asleep, Where Do We Go?",
    artist: "Billie Eilish",
    imageSrc: "/brand/home-albums/when-we-all-fall-asleep.webp",
  },
  {
    name: "Views",
    artist: "Drake",
    imageSrc: "/brand/home-albums/views.webp",
  },
  {
    name: "Midnights",
    artist: "Taylor Swift",
    imageSrc: "/brand/home-albums/midnights.webp",
  },
  {
    name: "After Hours",
    artist: "The Weeknd",
    imageSrc: "/brand/home-albums/after-hours.webp",
  },
  {
    name: "Un Verano Sin Ti",
    artist: "Bad Bunny",
    imageSrc: "/brand/home-albums/un-verano-sin-ti.webp",
  },
  {
    name: "Blonde",
    artist: "Frank Ocean",
    imageSrc: "/brand/home-albums/blonde.webp",
  },
  {
    name: "In Rainbows",
    artist: "Radiohead",
    imageSrc: "/brand/home-albums/in-rainbows.webp",
  },
  {
    name: "22, A Million",
    artist: "Bon Iver",
    imageSrc: "/brand/home-albums/22-a-million.webp",
  },
  {
    name: "Random Access Memories",
    artist: "Daft Punk",
    imageSrc: "/brand/home-albums/random-access-memories.webp",
  },
  {
    name: "Rumours",
    artist: "Fleetwood Mac",
    imageSrc: "/brand/home-albums/rumours.webp",
  },
  {
    name: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    imageSrc: "/brand/home-albums/to-pimp-a-butterfly.webp",
  },
] as const;
