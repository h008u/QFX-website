import { notFound } from "next/navigation";
import type { ArticleInput } from "@/app/admin/_actions/articles";
import { ArticleEditor } from "@/components/admin/article-editor";
import { PageHeader } from "@/components/admin/ui";
import { siteConfig } from "@/config/site";
import { ARTICLE_CATEGORIES, demoArticlesDb, type Article } from "@/lib/articles";
import { listMedia } from "@/lib/admin/media";
import { canEdit, getAdminContext } from "@/lib/admin/session";

export const metadata = { title: "تحرير مقال" };

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default async function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await getAdminContext())!;
  let initial: ArticleInput = {
    title: "", slug: "", excerpt: "", body_html: "<p></p>", cover_url: "", category: "تعليم", tags: "", status: "draft", featured: false, seo_title: "", seo_description: "", published_at: "",
  };
  if (id !== "new") {
    const db = (ctx.demo ? demoArticlesDb() : ctx.db) as typeof ctx.db;
    const { data } = await db.from("articles").select("*").eq("id", id).maybeSingle();
    const a = data as Article | null;
    if (!a) notFound();
    initial = {
      id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt ?? "", body_html: a.body_html, cover_url: a.cover_url ?? "", category: a.category, tags: a.tags.join("، "),
      status: a.status, featured: a.featured, seo_title: a.seo_title ?? "", seo_description: a.seo_description ?? "", published_at: toLocal(a.published_at),
    };
  }
  const media = (await listMedia(ctx)).map((m) => m.url);
  return (
    <>
      <PageHeader title={id === "new" ? "مقال جديد" : "تحرير مقال"} />
      <ArticleEditor initial={initial} categories={ARTICLE_CATEGORIES} media={media} siteUrl={siteConfig.url.replace(/\/$/, "")} canEdit={canEdit(ctx.role)} />
    </>
  );
}
