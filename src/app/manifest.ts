import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BonaFlow",
    short_name: "BonaFlow",
    description: "Find food faster. Keep every station flowing.",
    start_url: "/guest",
    display: "standalone",
    background_color: "#FBF9F4",
    theme_color: "#0F766E",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
