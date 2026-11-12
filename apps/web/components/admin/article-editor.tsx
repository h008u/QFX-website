"use client";

import { ExternalLink, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteArticleAction, saveArticleAction, type ArticleInput } from "@/app/admin/_actions/articles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichEditor } from "./rich-editor";
import { inputCls } from "./settings/common";
import { ActionMessage, Section, Switch, useAction } from "./ui";

const STATUS: [ArticleInput["status"], string][] = [
  ["draft", "مسودة"],
  ["published", "منشور"],
  ["archived", "مؤرشف"],
];

function slugify(v: string) {
  return v.trim().toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function ArticleEditor({ initial, categories, media, siteUrl, canEdit }: { initial: ArticleInput; categories: string[]; media: string[]; siteUrl: string; canEdit: boolean }) {
  const [a, setA] = useState<ArticleInput>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const router = useRouter();
  const save = useAction(async (v: ArticleInput) => {
    const r = await saveArticleAction(v);
    if (r.ok && r.id && !v.id) router.replace(`/admin/articles/${r.id}`);
    if (r.ok && r.slug) setA((x) => ({ ...x, id: r.id, slug: r.slug! }));
    return r;
  });
  const del = useAction(deleteArticleAction);
  const set = (p: Partial<ArticleInput>) => setA((x) => ({ ...x, ...p }));
  const ro = !canEdit;
  const seoTitle = a.seo_title || a.title || "عنوان المقال";
  const seoDesc = a.seo_description || a.excerpt || "وصف مختصر يظهر في نتائج البحث...";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <input
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-2xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="عنوان المقال"
          value={a.title}
          disabled={ro}
          onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
          <span className="shrink-0">{siteUrl}/blog/</span>
          <input
            className={cn(inputCls, "h-9")}
            value={a.slug}
            disabled={ro}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
            dir="auto"
          />
        </div>
        <textarea className={cn(inputCls, "h-auto min-h-[70px] py-2")} placeholder="مقتطف قصير يظهر في بطاقة المقال (اختياري — يُولّد من النص إن تُرك فارغاً)" maxLength={400} value={a.excerpt} disabled={ro} onChange={(e) => set({ excerpt: e.target.value })} />
        <RichEditor value={a.body_html} onChange={(body_html) => set({ body_html })} disabled={ro} />
      </div>

      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Section title="النشر">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
              {STATUS.map(([k, l]) => (
                <button key={k} disabled={ro} onClick={() => set({ status: k })} className={cn("rounded-md py-1.5 text-sm font-semibold", a.status === k ? "bg-background shadow" : "text-muted-foreground")}>
                  {l}
                </button>
              ))}
            </div>
            <label className="block text-xs text-muted-foreground">
              موعد النشر (اتركه فارغاً للنشر الآن)
              <input type="datetime-local" className={cn(inputCls, "mt-1")} value={a.published_at} disabled={ro} onChange={(e) => set({ published_at: e.target.value })} />
            </label>
            <Switch checked={a.featured} disabled={ro} onChange={(featured) => set({ featured })} label="مقال مميّز (يظهر كبيراً أعلى المدونة)" />
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button disabled={save.pending} onClick={() => save.run(a)}>
                  <Save className="h-4 w-4" /> {save.pending ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {a.id && a.status === "published" && (
                  <a href={`/blog/${encodeURIComponent(a.slug)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    عرض <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {a.id && (
                  <Button
                    variant="ghost"
                    className="ms-auto text-down"
                    onClick={async () => {
                      if (!confirm("حذف المقال نهائياً؟")) return;
                      const r = await del.run(a.id!);
                      if (r.ok) router.push("/admin/articles");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <ActionMessage result={save.result ?? del.result} />
          </div>
        </Section>

        <Section title="التصنيف والغلاف">
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">
              التصنيف
              <input list="article-cats" className={cn(inputCls, "mt-1")} value={a.category} disabled={ro} onChange={(e) => set({ category: e.target.value })} />
              <datalist id="article-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="block text-xs text-muted-foreground">
              الوسوم (افصل بفاصلة)
              <input className={cn(inputCls, "mt-1")} value={a.tags} disabled={ro} onChange={(e) => set({ tags: e.target.value })} placeholder="الذهب، مبتدئين" />
            </label>
            <label className="block text-xs text-muted-foreground">
              صورة الغلاف (رابط https)
              <input list="article-media" className={cn(inputCls, "mt-1")} dir="ltr" value={a.cover_url} disabled={ro} onChange={(e) => set({ cover_url: e.target.value })} placeholder="https://..." />
              <datalist id="article-media">{media.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            {a.cover_url && /^https?:\/\//.test(a.cover_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover_url} alt="" className="aspect-[1200/630] w-full rounded-md border border-border object-cover" />
            )}
          </div>
        </Section>

        <Section title="محركات البحث">
          <div className="space-y-3">
            <input className={inputCls} maxLength={120} placeholder="عنوان SEO (اختياري)" value={a.seo_title} disabled={ro} onChange={(e) => set({ seo_title: e.target.value })} />
            <textarea className={cn(inputCls, "h-auto min-h-[64px] py-2")} maxLength={300} placeholder="وصف SEO (اختياري)" value={a.seo_description} disabled={ro} onChange={(e) => set({ seo_description: e.target.value })} />
            <div className="rounded-lg border border-border p-3" dir="rtl">
              <p className="truncate text-xs text-up" dir="ltr">{siteUrl}/blog/{a.slug}</p>
              <p className="mt-0.5 line-clamp-1 text-[15px] font-semibold text-[#1a0dab] dark:text-[#8ab4f8]">{seoTitle} | QFX</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{seoDesc}</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
