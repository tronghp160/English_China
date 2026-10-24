import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sổ Từ — sổ từ vựng Anh, Trung",
    short_name: "Sổ Từ",
    description: "Sổ ghi và ôn từ vựng tiếng Anh, tiếng Trung — dùng chung với bạn bè.",
    lang: "vi",
    start_url: "/today?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F6FA",
    theme_color: "#F5F6FA",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ôn tập", short_name: "Ôn", url: "/review", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Bộ từ", url: "/decks", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
