import Link from "next/link";
import { DeleteCommentButton } from "@/components/admin/comment-row";
import { PageHeader } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "تعليقات المجتمع" };

interface CommentRow {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  news_id: string | null;
  signal_id: string | null;
  created_at: string;
}

export default async function CommentsPage({ searchParams }: { searchParams: Promise<{ q?: string; author?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { q = "", author = "" } = await searchParams;
  let query = ctx.db.from("comments").select("*").order("created_at", { ascending: false }).limit(200);
  if (author) query = query.eq("author_id", author);
  if (q.trim()) query = query.ilike("body", `%${q.trim()}%`);
  const { data } = await query;
  const rows = (data ?? []) as CommentRow[];

  const newsIds = [...new Set(rows.map((r) => r.news_id).filter(Boolean))] as string[];
  const sigIds = [...new Set(rows.map((r) => r.signal_id).filter(Boolean))] as string[];
  const [{ data: news }, { data: sigs }] = await Promise.all([
    newsIds.length ? ctx.db.from("news").select("id, title").in("id", newsIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    sigIds.length ? ctx.db.from("signals").select("id, symbol, direction").in("id", sigIds) : Promise.resolve({ data: [] as { id: string; symbol: string; direction: string }[] }),
  ]);
  const newsTitle = new Map((news ?? []).map((n) => [n.id, n.title]));
  const sigTitle = new Map((sigs ?? []).map((x) => [x.id, `${x.direction} ${x.symbol}`]));
  const authors = [...new Map(rows.map((r) => [r.author_id, r.author_name])).entries()];
  const edit = canEdit(ctx.role);

  return (
    <>
      <PageHeader title="تعليقات المجتمع" description="كل النقاشات تحت الأخبار والتوصيات في الموقع. احذف المخالف أو صفِّ حسب العضو. (حد الإرسال: 10 تعليقات بالدقيقة لكل عضو)" />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/comments">
        <input name="q" defaultValue={q} placeholder="بحث في النص..." className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm" />
        <button className="h-9 rounded-md bg-secondary px-3 text-sm">بحث</button>
        {author && <Link href="/admin/comments" className="h-9 rounded-md border border-border px-3 text-sm leading-9">إلغاء فلتر العضو</Link>}
      </form>
      {authors.length > 1 && !author && (
        <div className="mb-4 flex flex-wrap gap-2">
          {authors.slice(0, 20).map(([id, name]) => (
            <Link key={id} href={`/admin/comments?author=${id}`} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
              {name} <span className="num">({rows.filter((r) => r.author_id === id).length})</span>
            </Link>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card">
        <ul>
          {rows.map((c) => (
            <li key={c.id} className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.author_name}</span> •{" "}
                  <span className="num">{fmtDateTime(c.created_at, s.general.timezone)}</span> • على{" "}
                  <span className={cn(c.signal_id ? "text-primary" : "")}>{c.news_id ? newsTitle.get(c.news_id) ?? "خبر" : sigTitle.get(c.signal_id!) ?? "توصية"}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6">{c.body}</p>
              </div>
              {edit && <DeleteCommentButton id={c.id} preview={c.body} />}
            </li>
          ))}
          {!rows.length && <li className="p-10 text-center text-sm text-muted-foreground">لا تعليقات</li>}
        </ul>
      </div>
    </>
  );
}
