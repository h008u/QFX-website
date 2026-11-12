import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * مصدر واحد لكل ما يحتاجه محرك بحث أو زاحف ذكاء اصطناعي لفهم «ما هو QFX»:
 * حقائق الكيان، الكلمات المفتاحية لكل قسم، ومولّد البيانات الوصفية لكل صفحة.
 * (منقول ومكيّف من مشروع fx-partners)
 */
export const SITE = {
  name: "QFX",
  alternateName: "كيو إف إكس",
  /** التموضع بسطر واحد — نحن وكيل معرّف (IB) ولسنا شركة وساطة، وكل سطح آلي يجب أن يقول ذلك صراحة */
  tagline: "وكيل معرّف (IB) يربط المتداولين العرب بوسيط مرخّص، مع توصيات بسجل أداء شفاف وتحليلات يومية.",
  description:
    "QFX ليست شركة وساطة ولا تستلم أموال العملاء. نحن وكيل معرّف (Introducing Broker) نعرّف المتداولين على وسيط مرخّص ونرافقهم بتوصيات يومية بسجل أداء كامل، وتحليلات فنية، وأخبار المفكرة الاقتصادية، ومقالات تعليمية — بالعربية.",
  areaServed: ["IQ", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "EG", "MA", "DZ", "TN", "LY", "LB", "PS"],
} as const;

/** حسابات موثّقة نملكها فعلاً (مفصولة بفواصل) — بدونها لا ننشر sameAs إطلاقاً، وهذا هو الوضع الصادق */
export function sameAs(): string[] {
  return (process.env.NEXT_PUBLIC_SAME_AS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
}

/** الكلمات التي تجيب عنها كل صفحة فعلاً — تغذّي keywords وملف llms.txt */
export const KEYWORDS = {
  home: ["توصيات فوركس", "توصيات الذهب", "وكيل معرّف IB", "وسيط فوركس مرخص", "تحليل فني للعملات", "قناة توصيات تيليجرام", "forex signals arabic"],
  markets: ["سعر الذهب الآن", "أسعار العملات مباشر", "شارت XAUUSD", "التحليل الفني للذهب", "مؤشرات فنية", "live forex chart"],
  signals: ["توصيات فوركس مجانية", "سجل أداء التوصيات", "نسبة نجاح التوصيات", "نسخ التداول", "توصيات ذهب يومية"],
  feed: ["أخبار الفوركس", "المفكرة الاقتصادية", "تحليلات يومية", "أخبار الذهب والنفط"],
  blog: ["تعليم الفوركس", "مقالات تداول", "استراتيجيات التداول", "شرح الفوركس للمبتدئين", "إدارة رأس المال"],
  how: ["كيف أبدأ التداول", "فتح حساب فوركس", "ما هو الوكيل المعرّف", "الوسيط المرخص"],
  legal: ["سياسة الخصوصية", "شروط الاستخدام", "إفصاح المخاطر"],
} as const;

export type KeywordSet = keyof typeof KEYWORDS;

export function siteUrl(): string {
  return siteConfig.url.replace(/\/$/, "");
}

export function canonicalUrl(path: string): string {
  return `${siteUrl()}${path === "/" ? "/" : path}`;
}

/** صورة مشاركة عربية مولّدة (RTL) لأي عنوان */
export function ogImageUrl(title: string, subtitle?: string): string {
  const q = new URLSearchParams({ title });
  if (subtitle) q.set("subtitle", subtitle);
  return `${siteUrl()}/api/og?${q.toString()}`;
}

/**
 * بيانات وصفية موحّدة: canonical و Open Graph و Twitter.
 * الصفحة تمرّر ما يميّزها فقط، وكل ما يجب أن يتطابق عبر الموقع يُقرَّر هنا مرة واحدة.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: KeywordSet | readonly string[];
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noindex?: boolean;
}): Metadata {
  const { title, description, path, image, type = "website", publishedTime, noindex } = opts;
  const keywords = typeof opts.keywords === "string" ? KEYWORDS[opts.keywords] : opts.keywords;
  const url = canonicalUrl(path);
  const og = image ?? ogImageUrl(title, path === "/" ? SITE.tagline : undefined);
  return {
    title,
    description,
    ...(keywords?.length ? { keywords: [...keywords] } : {}),
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE.name,
      locale: "ar_AR",
      title,
      description,
      images: [{ url: og, width: 1200, height: 630 }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}
