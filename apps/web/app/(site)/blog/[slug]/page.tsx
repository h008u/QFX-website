import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard, ArticleCover, dateFmt } from "@/components/blog/article-card";
import { ShareLinks } from "@/components/blog/share-links";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getArticleBySlug, getPublishedArticles } from "@/lib/articles";
import { articleLd, breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { canonicalUrl, ogImageUrl, pageMeta } from "@/lib/seo";

export const revalidate = 300;

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const a = await getArticleBySlug(slug);
  if (!a) return { title: "مقال غير موجود", robots: { index: false } };
  return pageMeta({
    title: a.seo_title || a.title,
    description: a.seo_description || a.excerpt || a.title,
    path: `/blog/${encodeURIComponent(a.slug)}`,
    keywords: [a.category, ...a.tags],
    image: a.cover_url ?? ogImageUrl(a.title, a.category),
    type: "article",
    publishedTime: a.published_at ?? undefined,
  });
}

export default async function ArticlePage({ params }: P) {
  const slug = decodeURIComponent((await params).slug);
  const a = await getArticleBySlug(slug);
  if (!a) notFound();
  const related = (await getPublishedArticles({ category: a.category, limit: 4 })).filter((x) => x.id !== a.id).slice(0, 3);
  const path = `/blog/${encodeURIComponent(a.slug)}`;
  return (
    <article className="container py-8 md:py-12">
      <JsonLd
        data={[
          articleLd({ title: a.title, description: a.excerpt ?? a.title, path, image: a.cover_url, published: a.published_at, modified: a.updated_at, author: a.author_name }),
          breadcrumbLd([["الرئيسية", "/"], ["المقالات", "/blog"], [a.title, path]]),
        ]}
      />
      <div className="mx-auto max-w-[760px]">
        <nav className="mb-4 flex items-center gap-1 text-[13px] text-muted-foreground">
          <Link href="/blog" className="hover:text-primary">المقالات</Link>
          <ChevronLeft className="h-3.5 w-3.5" />
          <Link href={`/blog?c=${encodeURIComponent(a.category)}`} className="hover:text-primary">{a.category}</Link>
        </nav>
        <h1 className="text-[30px] font-bold leading-tight md:text-[44px]">{a.title}</h1>
        {a.excerpt && <p className="mt-4 text-lg leading-8 text-muted-foreground">{a.excerpt}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{a.author_name ?? "فريق QFX"}</span>
          <span>•</span>
          <time dateTime={a.published_at ?? undefined}>{dateFmt(a.published_at)}</time>
          <span>•</span>
          <span>{a.reading_minutes} دقائق قراءة</span>
          <ShareLinks url={canonicalUrl(path)} title={a.title} className="ms-auto" />
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-[900px]">
        <ArticleCover a={a} big />
      </div>
      <div className="article-body mx-auto mt-10 max-w-[760px]" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(a.body_html) }} />
      <div className="mx-auto mt-10 max-w-[760px] space-y-8">
        {a.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <span key={t} className="rounded-pill bg-secondary px-3 py-1 text-xs font-semibold">#{t}</span>
            ))}
          </div>
        )}
        <div className="glass-card flex flex-col items-start justify-between gap-4 rounded-2xl bg-panel p-6 text-panel-foreground md:flex-row md:items-center">
          <div>
            <p className="text-lg font-bold">طبّق ما تعلمته مع توصيات QFX</p>
            <p className="mt-1 text-sm text-panel-muted">افتح حسابك عبر الوكالة وانضم لقناة العملاء.</p>
          </div>
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
            ابدأ الآن
          </a>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          المحتوى تعليمي وليس نصيحة استثمارية. تداول العملات والعقود مقابل الفروقات ينطوي على مخاطر عالية. <Link href="/risk" className="underline">إفصاح المخاطر</Link>
        </p>
      </div>
      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1100px] border-t border-border pt-10">
          <h2 className="mb-6 text-2xl font-bold">مقالات ذات صلة</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ArticleCard key={r.id} a={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
