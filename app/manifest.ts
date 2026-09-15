import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soundprint-AI",
    short_name: "Soundprint",
    description:
      "Import Apple Music or Spotify listening history. Explore trends, chat with your data, and compare streams with friends.",
    start_url: "/en/dashboard/overview",
    scope: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#030712",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
