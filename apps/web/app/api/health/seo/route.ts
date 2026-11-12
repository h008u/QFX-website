import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/articles";
import { sameAs, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** فحص سريع لجاهزية السيو: رابط الموقع، الحسابات الموثّقة، المقالات وجودة بياناتها */
export async function GET() {
  const base = siteUrl();
  const articles = await getPublishedArticles({ limit: 500 });
  const checks = [
    { id: "site_url", ok: /^https:\/\//.test(base) && !base.includes("localhost"), detail: base, fix: "اضبط NEXT_PUBLIC_SITE_URL على نطاق الموقع الحقيقي (https)" },
    { id: "same_as", ok: sameAs().length > 0, detail: `${sameAs().length} حساب`, fix: "اضبط NEXT_PUBLIC_SAME_AS بروابط حساباتك الرسمية (تيليجرام، X، يوتيوب) مفصولة بفواصل" },
    { id: "articles", ok: articles.length >= 3, detail: `${articles.length} مقال منشور`, fix: "انشر 3 مقالات على الأقل لبناء محتوى قابل للفهرسة" },
    {
      id: "article_meta",
      ok: articles.every((a) => (a.excerpt ?? "").length >= 60),
      detail: `${articles.filter((a) => (a.excerpt ?? "").length < 60).length} مقال بمقتطف قصير`,
      fix: "اكتب مقتطفاً بطول 60 حرفاً فأكثر لكل مقال (يظهر كوصف في البحث)",
    },
    { id: "article_covers", ok: articles.every((a) => !!a.cover_url), detail: `${articles.filter((a) => !a.cover_url).length} مقال بلا غلاف`, fix: "أضف صورة غلاف (تُستخدم صورة مولّدة تلقائياً حتى ذلك)" },
  ];
  return NextResponse.json({ ok: checks.every((c) => c.ok), site: base, checks, endpoints: [`${base}/sitemap.xml`, `${base}/robots.txt`, `${base}/llms.txt`, `${base}/llms-full.txt`] });
}
