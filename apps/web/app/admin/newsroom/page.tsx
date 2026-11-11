import Link from "next/link";
import { AgendaBoard, type AgendaEvent } from "@/components/admin/agenda-board";
import { PostLog, type LogPost } from "@/components/admin/flow/post-log";
import { TradingViewWidget } from "@/components/admin/tv-widget";
import { PageHeader } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "غرفة الأخبار والأجندة" };

const TABS = [
  ["live", "الأخبار الحية"],
  ["agenda", "الأجندة الاقتصادية"],
  ["widgets", "TradingView"],
] as const;

export default async function NewsroomPage({ searchParams }: { searchParams: Promise<{ tab?: string; source?: string }> }) {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const tz = s.general.timezone;
  const { tab = "live", source = "" } = await searchParams;

  let content: React.ReactNode = null;
  if (tab === "agenda") {
    const { data } = await ctx.db
      .from("news")
      .select("id, title, currency, impact, event_time, meta")
      .eq("kind", "calendar")
      .gte("event_time", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("event_time")
      .limit(300);
    const dayFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
    const timeFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    const events: AgendaEvent[] = (data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      title_en: (e.meta as { title_en?: string } | null)?.title_en ?? e.title,
      currency: e.currency,
      impact: e.impact,
      event_time: e.event_time,
      forecast: (e.meta as { forecast?: string } | null)?.forecast ?? null,
      previous: (e.meta as { previous?: string } | null)?.previous ?? null,
      dayLabel: dayFmt.format(new Date(e.event_time)),
      timeLabel: timeFmt.format(new Date(e.event_time)),
    }));
    content = <AgendaBoard events={events} />;
  } else if (tab === "widgets") {
    content = (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">أهم أخبار السوق</p>
          <TradingViewWidget kind="timeline" config={{ feedMode: "market", market: "forex", displayMode: "regular" }} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">الأجندة الاقتصادية</p>
          <TradingViewWidget kind="events" config={{ importanceFilter: "0,1", countryFilter: "us,eu,gb,jp,ch,ca,au,nz" }} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">أخبار الذهب</p>
          <TradingViewWidget kind="timeline" config={{ feedMode: "symbol", symbol: "OANDA:XAUUSD", displayMode: "regular" }} height={420} />
        </div>
      </div>
    );
  } else {
    let q = ctx.db.from("posts").select("*").eq("kind", "news").order("created_at", { ascending: false }).limit(120);
    if (source) q = q.eq("source", source);
    const [{ data }, { data: srcRows }] = await Promise.all([q, ctx.db.from("posts").select("source").eq("kind", "news").limit(1000)]);
    const sources = [...new Set((srcRows ?? []).map((r) => r.source).filter(Boolean))] as string[];
    const posts: LogPost[] = ((data ?? []) as Omit<LogPost, "createdLabel">[]).map((p) => ({ ...p, createdLabel: fmtDateTime(p.created_at, tz) }));
    content = (
      <>
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/admin/newsroom" className={cn("rounded-full border px-3 py-1.5 text-xs", !source ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>كل المصادر</Link>
          {sources.map((src) => (
            <Link key={src} href={`/admin/newsroom?source=${encodeURIComponent(src)}`} className={cn("rounded-full border px-3 py-1.5 text-xs", source === src ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
              {src}
            </Link>
          ))}
        </div>
        <PostLog posts={posts} canEdit={canEdit(ctx.role)} destLabels={Object.fromEntries(s.destinations.map((d) => [d.id, d.label]))} live={!ctx.demo} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="غرفة الأخبار والأجندة" description="كل الأخبار من مصادر البوت وحالتها (نُشر، انفلتر، مكرر، ينتظر)، والأجندة الاقتصادية مع عد تنازلي للخبر القادم، وويدجتات TradingView الرسمية." />
      <div className="mb-5 flex gap-2 border-b border-border">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/newsroom?tab=${k}`} className={cn("-mb-px border-b-2 px-4 py-2 text-sm", tab === k ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </div>
      {content}
    </>
  );
}
