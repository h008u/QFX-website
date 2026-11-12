import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/blog/article-card";
import { PageTitle } from "@/components/page-title";
import { breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { getPublishedArticles } from "@/lib/articles";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = pageMeta({
  title: "المقالات",
  description: "مقالات تعليمية وتحليلية عن الفوركس والذهب وإدارة رأس المال واستراتيجيات التداول — بالعربية ومن فريق QFX.",
  path: "/blog",
  keywords: "blog",
});

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const all = await getPublishedArticles({ limit: 60 });
  const cats = [...new Set(all.map((a) => a.category))];
  const list = c ? all.filter((a) => a.category === c) : all;
  const featured = !c ? (list.find((a) => a.featured) ?? list[0]) : undefined;
  const rest = list.filter((a) => a !== featured);
  return (
    <div className="container space-y-10 py-8 md:py-12">
      <JsonLd data={breadcrumbLd([["الرئيسية", "/"], ["المقالات", "/blog"]])} />
      <PageTitle title="المقالات" text="تعلّم التداول خطوة بخطوة: أساسيات، استراتيجيات، إدارة مخاطر، وقراءة للأسواق." />
      {cats.length > 1 && (
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {[["", "الكل"], ...cats.map((x) => [x, x])].map(([k, l]) => (
            <Link key={k} href={k ? `/blog?c=${encodeURIComponent(k)}` : "/blog"} className={cn("h-9 shrink-0 rounded-pill px-4 text-sm font-semibold leading-9", (c ?? "") === k ? "bg-foreground text-background" : "bg-secondary")}>
              {l}
            </Link>
          ))}
        </div>
      )}
      {featured && (
        <div className="border-b border-border pb-10">
          <ArticleCard a={featured} big />
        </div>
      )}
      {rest.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </div>
      ) : (
        !featured && <p className="py-16 text-center text-muted-foreground">لا توجد مقالات منشورة بعد.</p>
      )}
    </div>
  );
}
