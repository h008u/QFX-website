import { POST_KIND_LABEL, POST_STATUS_LABEL, type PostKind, type PostStatus } from "@qfx/shared";
import { ArrowLeft, CheckCircle2, Filter, Inbox, Radio, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { PostLog, type LogPost } from "@/components/admin/flow/post-log";
import { PageHeader } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "التدفق والسجل" };

const STATUS_FILTERS: { key: string; label: string; statuses: PostStatus[] }[] = [
  { key: "", label: "الكل", statuses: [] },
  { key: "published", label: "نُشر", statuses: ["published", "partial"] },
  { key: "pending", label: "ينتظر", statuses: ["pending"] },
  { key: "scheduled", label: "مجدول", statuses: ["scheduled"] },
  { key: "filtered", label: "انفلتر/مكرر", statuses: ["filtered", "duplicate"] },
  { key: "failed", label: "فشل", statuses: ["failed", "partial"] },
  { key: "rejected", label: "مرفوض", statuses: ["rejected"] },
];

export default async function FlowPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const { status = "", kind = "", q = "" } = await searchParams;
  const filter = STATUS_FILTERS.find((f) => f.key === status) ?? STATUS_FILTERS[0];

  let query = ctx.db.from("posts").select("*").order("created_at", { ascending: false }).limit(150);
  if (filter.statuses.length) query = query.in("status", filter.statuses);
  if (kind) query = query.eq("kind", kind);
  if (q.trim()) query = query.or(`title.ilike.*${q.trim().replace(/[,()*]/g, " ")}*,body.ilike.*${q.trim().replace(/[,()*]/g, " ")}*`);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [{ data }, { data: today }, { data: newsRun }, { data: lastResults }] = await Promise.all([
    query,
    ctx.db.from("posts").select("status").gte("created_at", since),
    ctx.db.from("task_runs").select("result, ok, error, last_run_at").eq("task", "news").maybeSingle(),
    ctx.db.from("posts").select("results, published_at").in("status", ["published", "partial", "failed"]).order("created_at", { ascending: false }).limit(40),
  ]);

  const count = (st: PostStatus[]) => (today ?? []).filter((r) => st.includes(r.status as PostStatus)).length;
  const sources = Object.entries(((newsRun?.result as { sources?: Record<string, { ok: boolean; count: number; error?: string }> } | null)?.sources) ?? {});
  const destLabels = Object.fromEntries(s.destinations.map((d) => [d.id, d.label]));
  const lastPerDest = new Map<string, { ok: boolean; error?: string }>();
  for (const row of lastResults ?? []) for (const r of (row.results ?? []) as { dest: string; ok: boolean; error?: string }[]) if (!lastPerDest.has(r.dest)) lastPerDest.set(r.dest, r);

  const posts: LogPost[] = ((data ?? []) as Omit<LogPost, "createdLabel">[]).map((p) => ({ ...p, createdLabel: fmtDateTime(p.created_at, s.general.timezone) }));
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ status, kind, q, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/flow${p.size ? `?${p}` : ""}`;
  };

  const stages = [
    { label: "المصادر", icon: Radio, value: sources.length ? `${sources.filter(([, v]) => v.ok).length}/${sources.length}` : "—", sub: "مصدر يعمل", href: "/admin/settings#news" },
    { label: "الفلترة", icon: Filter, value: count(["filtered", "duplicate"]), sub: "انفلتر/مكرر (24س)", href: qs({ status: "filtered" }) },
    { label: "الموافقة", icon: Inbox, value: count(["pending"]), sub: "ينتظر", href: "/admin/review" },
    { label: "النشر", icon: Send, value: count(["published", "partial"]), sub: "نُشر (24س)", href: qs({ status: "published" }) },
  ];

  return (
    <>
      <PageHeader title="التدفق والسجل" description="طريق المحتوى من المصادر حتى أماكن النشر، وسجل مباشر لكل عنصر وما حدث له." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1.3fr]">
        {stages.map((st, i) => (
          <div key={st.label} className="contents">
            <Link href={st.href} className="rounded-lg border border-border bg-card p-4 hover:border-zinc-600">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <st.icon className="h-4 w-4 text-primary" /> {st.label}
              </div>
              <p className="num mt-2 text-2xl font-bold">{st.value}</p>
              <p className="text-[11px] text-muted-foreground">{st.sub}</p>
            </Link>
            {i < stages.length && <ArrowLeft className="mx-auto hidden h-5 w-5 self-center text-muted-foreground lg:block" />}
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">أماكن النشر</p>
          <ul className="space-y-1.5">
            {s.destinations.map((d) => {
              const last = lastPerDest.get(d.id);
              return (
                <li key={d.id} className="flex items-center gap-2 text-xs" title={last?.error}>
                  {!d.enabled ? <span className="h-2 w-2 rounded-full bg-muted-foreground" /> : last?.ok === false ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  <span className="truncate">{d.label}</span>
                </li>
              );
            })}
            {!s.destinations.length && <li className="text-xs text-muted-foreground">القناة الافتراضية</li>}
          </ul>
        </div>
      </div>

      {sources.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {sources.map(([id, v]) => (
            <span key={id} title={v.error} className={cn("rounded-full border px-3 py-1 text-xs", v.ok ? "border-border text-muted-foreground" : "border-destructive/40 text-destructive")}>
              {v.ok ? "●" : "✕"} {id} <span className="num">{v.count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link key={f.key} href={qs({ status: f.key })} className={cn("rounded-full border px-3 py-1.5 text-xs", f.key === status ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
            {f.label}
          </Link>
        ))}
        <form action="/admin/flow" className="flex w-full flex-wrap gap-2 sm:ms-auto sm:w-auto">
          <input type="hidden" name="status" value={status} />
          <select name="kind" defaultValue={kind} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">كل الأنواع</option>
            {Object.entries(POST_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="بحث..." className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs sm:w-40 sm:flex-none" />
          <button className="h-9 rounded-md bg-secondary px-3 text-xs">تطبيق</button>
        </form>
      </div>

      <PostLog posts={posts} canEdit={canEdit(ctx.role)} destLabels={destLabels} live={!ctx.demo} />
      <p className="mt-3 text-xs text-muted-foreground">
        يعرض آخر 150 عنصراً{kind ? ` من نوع ${POST_KIND_LABEL[kind as PostKind]}` : ""}{filter.statuses.length ? ` بحالة ${filter.statuses.map((x) => POST_STATUS_LABEL[x]).join("/")}` : ""}.
      </p>
    </>
  );
}
