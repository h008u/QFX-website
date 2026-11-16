import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// يجعل الموقع قابلاً للتثبيت كتطبيق على الشاشة الرئيسية (أندرويد وiOS والكمبيوتر)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "ar",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F7F2",
    theme_color: "#0A1D42",
    categories: ["finance", "news"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "التوصيات", url: "/signals", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "الأسواق", url: "/markets", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "شارت الذهب", url: "/markets/xauusd?view=chart", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
