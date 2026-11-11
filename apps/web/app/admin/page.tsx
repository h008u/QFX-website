import { POST_KIND_LABEL, type PostKind, type PostStatus } from "@qfx/shared";
import { AlertTriangle, CheckCircle2, Clock, Filter, Inbox, Send, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "نظرة عامة" };

interface Row {
  id: string;
  kind: PostKind;
  status: PostStatus;
  title: string | null;
  body: string;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
}

const dayKey = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

export default async function OverviewPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const tz = s.general.timezone;
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ data: posts }, { data: audit }, { data: tasks }, leadsRes] = await Promise.all([
    ctx.db.from("posts").select("id, kind, status, title, body, created_at, published_at, scheduled_at").gte("created_at", since7).order("created_at", { ascending: false }).limit(2000),
    ctx.db.from("audit_log").select("action, target, actor_email, created_at").order("created_at", { ascending: false }).limit(8),
    ctx.db.from("task_runs").select("task, ok, error, last_run_at").neq("task", "_tick_lock"),
    ctx.db.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since7),
  ]);
  const rows = (posts ?? []) as Row[];
  const today = dayKey(new Date().toISOString(), tz);
  const todayRows = rows.filter((r) => dayKey(r.created_at, tz) === today);
  const isPub = (r: Row) => r.status === "published" || r.status === "partial";

  const { data: upcoming } = await ctx.db
    .from("posts")
    .select("id, kind, status, title, body, scheduled_at, created_at, published_at")
    .eq("status", "scheduled")
    .order("scheduled_at")
    .limit(5);

  const kpis = [
    { label: "نُشر اليوم", value: todayRows.filter(isPub).length, icon: Send, tone: "text-success", href: "/admin/flow?status=published" },
    { label: "نُشر خلال 7 أيام", value: rows.filter(isPub).length, icon: CheckCircle2, tone: "text-foreground", href: "/admin/flow" },
    { label: "ينتظر موافقتك", value: rows.filter((r) => r.status === "pending").length, icon: Inbox, tone: "text-primary", href: "/admin/review" },
    { label: "مجدول", value: (upcoming ?? []).length, icon: Clock, tone: "text-sky-400", href: "/admin/calendar" },
    { label: "انفلتر/مكرر اليوم", value: todayRows.filter((r) => r.status === "filtered" || r.status === "duplicate").length, icon: Filter, tone: "text-muted-foreground", href: "/admin/flow?status=filtered" },
    { label: "فشل اليوم", value: todayRows.filter((r) => r.status === "failed" || r.status === "partial").length, icon: XCircle, tone: "text-destructive", href: "/admin/flow?status=failed" },
    { label: "طلبات انضمام (7 أيام)", value: leadsRes.count ?? 0, icon: UserPlus, tone: "text-gold", href: "/admin/crm" },
  ];

  // رسم آخر 7 أيام
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const key = dayKey(d.toISOString(), tz);
    return {
      key,
      label: new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "short", timeZone: tz }).format(d),
      published: rows.filter((r) => isPub(r) && dayKey(r.created_at, tz) === key).length,
      other: rows.filter((r) => !isPub(r) && dayKey(r.created_at, tz) === key).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.published + d.other));

  const byKind = new Map<PostKind, number>();
  rows.filter(isPub).forEach((r) => byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1));
  const failing = (tasks ?? []).filter((t) => t.ok === false);

  return (
    <>
      <PageHeader title="نظرة عامة" description="ملخص ما نشره البوت وما ينتظرك، وآخر ما حدث في اللوحة." />

      {(failing.length > 0 || s.general.paused || !s.destinations.length) && (
        <div className="mb-6 space-y-2">
          {s.general.paused && <Warn href="/admin/settings#general">النشر التلقائي متوقف مؤقتاً — المحتوى الجديد ينتظر موافقتك.</Warn>}
          {!s.destinations.length && <Warn href="/admin/settings#destinations">لم تحدد أماكن النشر بعد؛ البوت يستخدم TELEGRAM_CHANNEL_ID لكل الأنواع.</Warn>}
          {failing.map((t) => (
            <Warn key={t.task} href="/admin/system" bad>
              المهمة «{t.task}» متوقفة: {t.error}
            </Warn>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-zinc-600">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {k.label}
              <k.icon className={cn("h-4 w-4", k.tone)} />
            </div>
            <p className={cn("num mt-2 text-end text-2xl font-bold", k.tone)}>{k.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">آخر 7 أيام</h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" /> نُشر</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-zinc-600" /> لم يُنشر</span>
            </div>
          </div>
          <div className="flex h-44 items-end gap-3" dir="ltr">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="num text-[11px] text-muted-foreground">{d.published}</span>
                <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t" style={{ height: `${((d.published + d.other) / max) * 130 + 2}px` }}>
                  <div className="bg-primary" style={{ flexGrow: d.published }} />
                  <div className="bg-zinc-600" style={{ flexGrow: d.other }} />
                </div>
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            {[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <span key={k} className="rounded-full bg-secondary px-3 py-1 text-xs">
                {POST_KIND_LABEL[k]} <b className="num ms-1">{n}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 font-bold">المواعيد القادمة</h2>
          <ul>
            {(upcoming ?? []).map((p) => (
              <li key={p.id} className="flex items-start gap-3 border-b border-border/60 px-5 py-3 text-sm last:border-0">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div className="min-w-0">
                  <p className="truncate">{p.title || p.body.replace(/[*_`]/g, "").slice(0, 70)}</p>
                  <p className="num text-xs text-muted-foreground">{fmtDateTime(p.scheduled_at, tz)}</p>
                </div>
              </li>
            ))}
            {!upcoming?.length && <li className="px-5 py-6 text-center text-sm text-muted-foreground">لا منشورات مجدولة</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-bold">آخر ما حدث بالبوت</h2>
            <Link href="/admin/flow" className="text-xs text-primary hover:underline">السجل الكامل</Link>
          </div>
          <ul>
            {rows.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-border/60 px-5 py-2.5 text-sm last:border-0">
                <StatusBadge status={p.status} />
                <span className="min-w-0 flex-1 truncate">{p.title || p.body.slice(0, 80)}</span>
                <span className="num shrink-0 text-xs text-muted-foreground">{fmtDateTime(p.created_at, tz)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-bold">آخر نشاط الفريق</h2>
            <Link href="/admin/activity" className="text-xs text-primary hover:underline">سجل النشاط</Link>
          </div>
          <ul>
            {(audit ?? []).map((a, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-border/60 px-5 py-2.5 text-sm last:border-0">
                <span className="font-semibold">{a.actor_email}</span>
                <span className="num rounded bg-secondary px-1.5 text-[11px] text-muted-foreground">{a.action}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.target}</span>
                <span className="num shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.created_at, tz)}</span>
              </li>
            ))}
            {!audit?.length && <li className="px-5 py-6 text-center text-sm text-muted-foreground">لا نشاط بعد</li>}
          </ul>
        </div>
      </div>
    </>
  );
}

function Warn({ children, href, bad }: { children: React.ReactNode; href: string; bad?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-lg border px-4 py-3 text-sm", bad ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-gold/40 bg-gold/10 text-gold")}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}
