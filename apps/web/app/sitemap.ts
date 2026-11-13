import type { MetadataRoute } from "next";
import { MARKETS, marketHref } from "@/config/markets";
import { getPublishedArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1, lastModified: now },
    { url: `${base}/markets`, changeFrequency: "hourly", priority: 0.9, lastModified: now },
    { url: `${base}/signals`, changeFrequency: "hourly", priority: 0.9, lastModified: now },
    { url: `${base}/feed`, changeFrequency: "hourly", priority: 0.8, lastModified: now },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${base}/performance`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    ...["/privacy", "/terms", "/cookies", "/risk"].map((p) => ({ url: `${base}${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...MARKETS.map((m) => ({ url: `${base}${marketHref(m.symbol)}`, changeFrequency: "hourly" as const, priority: 0.7 })),
  ];
  const articles = await getPublishedArticles({ limit: 500 });
  return [
    ...pages,
    ...articles.map((a) => ({
      url: `${base}/blog/${encodeURIComponent(a.slug)}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
