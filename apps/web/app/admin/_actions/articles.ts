"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { demoArticlesDb, type ArticleStatus } from "@/lib/articles";
import { audit, requireRole } from "@/lib/admin/session";
import { htmlToText, readingMinutes, sanitizeRichHtml, slugify } from "@/lib/sanitize";

export interface ArticleInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body_html: string;
  cover_url: string;
  category: string;
  tags: string;
  status: ArticleStatus;
  featured: boolean;
  seo_title: string;
  seo_description: string;
  published_at: string; // datetime-local أو فارغ
}

const clip = (v: string, n: number) => v.trim().slice(0, n);

/* eslint-disable @typescript-eslint/no-explicit-any */
async function dbFor() {
  const ctx = await requireRole("editor");
  return { ctx, db: (ctx.demo ? demoArticlesDb() : ctx.db) as any };
}

/** يحفظ مقالاً (جديداً أو موجوداً) بعد تنظيف المحتوى على الخادم */
export async function saveArticleAction(input: ArticleInput): Promise<ActionResult & { id?: string; slug?: string }> {
  const { ctx, db } = await dbFor();
  const title = clip(input.title, 200);
  if (title.length < 3) return { ok: false, message: "العنوان قصير جداً" };
  const slug = slugify(input.slug || title);
  if (slug.length < 2) return { ok: false, message: "رابط المقال غير صالح" };
  const body = sanitizeRichHtml(input.body_html);
  const cover = clip(input.cover_url, 500);
  if (cover && !/^https?:\/\//.test(cover)) return { ok: false, message: "رابط صورة الغلاف يجب أن يبدأ بـ https://" };
  const status: ArticleStatus = ["draft", "published", "archived"].includes(input.status) ? input.status : "draft";
  let published_at: string | null = input.published_at ? new Date(input.published_at).toISOString() : null;
  if (status === "published" && !published_at) published_at = new Date().toISOString();

  // الرابط فريد
  const { data: clash } = await db.from("articles").select("id").eq("slug", slug).maybeSingle();
  if (clash && clash.id !== input.id) return { ok: false, message: "يوجد مقال آخر بنفس الرابط — غيّره" };

  const row = {
    title,
    slug,
    excerpt: clip(input.excerpt, 400) || clip(htmlToText(body), 220) || null,
    body_html: body,
    cover_url: cover || null,
    category: clip(input.category, 40) || "تعليم",
    tags: input.tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean).slice(0, 12),
    status,
    featured: !!input.featured,
    seo_title: clip(input.seo_title, 120) || null,
    seo_description: clip(input.seo_description, 300) || null,
    reading_minutes: readingMinutes(body),
    published_at,
    author_name: ctx.user.name,
    ...(ctx.demo ? {} : { author_id: ctx.user.id }),
  };
  let id = input.id;
  if (id) {
    const { error } = await db.from("articles").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const now = new Date().toISOString();
    const { data, error } = await db.from("articles").insert({ ...row, ...(ctx.demo ? { id: crypto.randomUUID(), created_at: now, updated_at: now } : {}) }).select("id").single();
    if (error) return { ok: false, message: error.message };
    id = data.id;
  }
  await audit(ctx, input.id ? "article.update" : "article.create", title, { status });
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/", "layout");
  return { ok: true, message: status === "published" ? "تم الحفظ والنشر ✅" : "تم الحفظ ✅", id, slug };
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const { ctx, db } = await dbFor();
  const { error } = await db.from("articles").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  await audit(ctx, "article.delete", id);
  revalidatePath("/blog");
  return { ok: true, message: "تم حذف المقال" };
}
