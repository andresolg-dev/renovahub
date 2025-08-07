import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RenovaHub",
    short_name: "RenovaHub",
    description: "Gestión centralizada de licencias de software y notificaciones de renovación.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/logo.png", // Use the new logo for PWA
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png", // Use the new logo for PWA
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
