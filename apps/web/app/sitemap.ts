import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/how-it-works", "/signals", "/feed"].map((p) => ({ url: `${siteConfig.url}${p}`, changeFrequency: "daily" }));
}
