import { XMLParser } from "fast-xml-parser";
import { fetchWithTimeout, stripHtml } from "./fetch";

export interface NewsItem {
  key: string;
  title: string;
  summary: string;
  link: string | null;
  date: Date | null;
  image: string | null;
}

export interface NewsSource {
  id: string;
  label: string;
  url?: string;
  on: boolean;
  fetch?: () => Promise<NewsItem[]>;
  note?: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

const text = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return String((v as Record<string, unknown>)["#text"] ?? "");
  return String(v);
};
const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** يحلل RSS أو Atom */
export function parseFeed(xml: string): NewsItem[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const rssItems = arr(doc?.rss?.channel?.item);
  const atomItems = arr(doc?.feed?.entry);
  const items = rssItems.length ? rssItems : atomItems;
  return items
    .map((i: Record<string, any>) => {
      const link =
        typeof i.link === "string"
          ? i.link
          : arr(i.link).map((l: any) => l?.["@_href"]).find(Boolean) ?? text(i.link) ?? null;
      const dateRaw = text(i.pubDate) || text(i.published) || text(i.updated) || text(i["dc:date"]);
      const d = dateRaw ? new Date(dateRaw) : null;
      const image =
        i.enclosure?.["@_url"] ?? arr(i["media:content"])[0]?.["@_url"] ?? arr(i["media:thumbnail"])[0]?.["@_url"] ?? null;
      const title = stripHtml(text(i.title));
      return {
        key: text(i.guid) || link || title,
        title,
        summary: stripHtml(text(i.description) || text(i.summary) || text(i["content:encoded"])).slice(0, 600),
        link: link || null,
        date: d && !Number.isNaN(d.getTime()) ? d : null,
        image: typeof image === "string" ? image : null,
      };
    })
    .filter((i) => i.title);
}

async function rss(url: string): Promise<NewsItem[]> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text());
}

// أخبار TradingView: نفس الواجهة التي يستخدمها موقعهم (مجانية لكن غير رسمية)
async function tradingview(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  for (const category of ["forex", "commodities"]) {
    const url = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=en&category=${category}`;
    const res = await fetchWithTimeout(url, { headers: { Origin: "https://www.tradingview.com", Referer: "https://www.tradingview.com/" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as any;
    for (const n of Array.isArray(data) ? data : data.items ?? []) {
      if (!n?.title) continue;
      const path = n.storyPath || (n.id ? `/news/${n.id}/` : "");
      items.push({
        key: String(n.id ?? n.title),
        title: n.title,
        summary: stripHtml(n.shortDescription ?? ""),
        link: n.link || (path ? `https://www.tradingview.com${path}` : null),
        date: n.published ? new Date(n.published * 1000) : null,
        image: null,
      });
    }
  }
  return items;
}

/** المصادر المدمجة (من Spir-Telegrambot) */
export const BUILT_IN_SOURCES: NewsSource[] = [
  { id: "inv_fx", label: "Investing عربي — العملات", url: "https://sa.investing.com/rss/news_1.rss", on: true },
  { id: "inv_eco", label: "Investing عربي — الاقتصاد", url: "https://sa.investing.com/rss/news_14.rss", on: true },
  { id: "inv_cmd", label: "Investing عربي — السلع", url: "https://sa.investing.com/rss/news_11.rss", on: false },
  { id: "tv_news", label: "TradingView News", fetch: tradingview, on: true, note: "واجهة غير رسمية وقد تتغير" },
  { id: "fxstreet", label: "FXStreet", url: "https://www.fxstreet.com/rss/news", on: false, note: "قد يحجبه Cloudflare" },
  { id: "forexlive", label: "ForexLive", url: "https://www.forexlive.com/feed/news", on: false },
  { id: "cnbc", label: "CNBC — الاقتصاد", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", on: false },
  { id: "oilprice", label: "OilPrice.com — النفط", url: "https://oilprice.com/rss/main", on: false },
];

export function allSources(custom: { id: string; label: string; url: string; on: boolean }[]): NewsSource[] {
  return [...BUILT_IN_SOURCES, ...custom.map((c) => ({ ...c, id: `custom_${c.id}` }))];
}

export const sourceOn = (src: NewsSource, toggles: Record<string, boolean>) => toggles[src.id] ?? src.on;

export async function fetchSource(src: NewsSource): Promise<NewsItem[]> {
  if (src.fetch) return src.fetch();
  if (!src.url) return [];
  return rss(src.url);
}
