import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { demoArticlesDb, type Article } from "@/lib/articles";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "المقالات" };

const STATUS_CLS: Record<string, [string, string]> = {
  draft: ["مسودة", "bg-secondary text-muted-foreground"],
  published: ["منشور", "bg-success/15 text-up"],
  archived: ["مؤرشف", "bg-secondary text-muted-foreground line-through"],
};

export default async function ArticlesAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const ctx = (await getAdminContext())!;
  const db = (ctx.demo ? demoArticlesDb() : ctx.db) as typeof ctx.db;
  let q = db.from("articles").select("id, slug, title, status, category, published_at, updated_at, featured, reading_minutes");
  if (status) q = q.eq("status", status);
  const { data } = await q.order("updated_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Pick<Article, "id" | "slug" | "title" | "status" | "category" | "published_at" | "updated_at" | "featured" | "reading_minutes">[];
  return (
    <>
      <PageHeader
        title="المقالات"
        description="مقالات تعليمية وتحليلية طويلة بمحرر غني، تظهر في /blog وتُحسّن ظهور الموقع في محركات البحث."
        actions={
          canEdit(ctx.role) ? (
            <Link href="/admin/articles/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> مقال جديد
            </Link>
          ) : null
        }
      />
      <div className="mb-4 flex gap-2">
        {[["", "الكل"], ["published", "منشور"], ["draft", "مسودة"], ["archived", "مؤرشف"]].map(([k, l]) => (
          <Link key={k} href={k ? `/admin/articles?status=${k}` : "/admin/articles"} className={cn("rounded-md px-3 py-1.5 text-sm", (status ?? "") === k ? "bg-foreground text-background" : "bg-secondary")}>
            {l}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
              <th>العنوان</th>
              <th>الحالة</th>
              <th>التصنيف</th>
              <th>النشر</th>
              <th>آخر تعديل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <Link href={`/admin/articles/${r.id}`} className="font-semibold hover:text-primary">
                    {r.featured && "⭐ "}
                    {r.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{r.reading_minutes} د قراءة</p>
                </td>
                <td>
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", STATUS_CLS[r.status]?.[1])}>{STATUS_CLS[r.status]?.[0]}</span>
                </td>
                <td className="text-muted-foreground">{r.category}</td>
                <td className="text-muted-foreground">{r.published_at ? formatDateTime(r.published_at) : "—"}</td>
                <td className="text-muted-foreground">{formatDateTime(r.updated_at)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">لا توجد مقالات بعد — ابدأ بكتابة أول مقال.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
