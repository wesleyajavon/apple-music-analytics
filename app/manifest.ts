import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soundprint-AI",
    short_name: "Soundprint",
    description:
      "Personal dashboard to analyze your Apple Music and Spotify listening habits.",
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
