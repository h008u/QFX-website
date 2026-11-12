import { CLOSED_STATUSES, DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { ogImageUrl, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { AdvancedChart, type ChartLevel } from "@/components/market/advanced-chart";
import { Gauge, ratingTone, RATING_LABEL } from "@/components/market/gauge";
import { Change, fmtPrice } from "@/components/market/price";
import { SymbolLogo } from "@/components/market/symbol-logo";
import { WatchlistPanel, type WatchItem } from "@/components/market/watchlist";
import { WatchlistMobileFiltered } from "@/components/market/watchlist-filter";
import { CATEGORY_LABEL, marketOf } from "@/config/markets";
import { getNews, getSignals } from "@/lib/data";
import { getMarkets, technicals, type MarketSeries } from "@/lib/market-data";
import { cn, timeAgo } from "@/lib/utils";
import { MobileSearchButton } from "./mobile-search";

export const revalidate = 1800;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ s?: string }> }): Promise<Metadata> {
  const { s } = await searchParams;
  const m = marketOf(s ?? "XAUUSD");
  const sym = m?.symbol ?? "XAUUSD";
  return pageMeta({
    title: m ? `${m.symbol} — ${m.name}` : "الأسواق",
    description: m ? `سعر ${m.name} (${m.symbol}) الآن مع الشارت التفاعلي والتحليل الفني والتوصيات.` : "أسعار الذهب والعملات والنفط والكريبتو مباشرة مع الشارتات والتحليل الفني.",
    path: `/markets?s=${sym}`,
    keywords: "markets",
    image: ogImageUrl(m ? `${m.symbol} — ${m.name}` : "الأسواق", "الشارت والتحليل الفني والتوصيات"),
  });
}

/** حالة السوق: الفوركس والسلع من الأحد 22:00 حتى الجمعة 22:00 (UTC)، والكريبتو دائماً */
function marketOpen(category: string, now = new Date()) {
  if (category === "crypto") return true;
  const d = now.getUTCDay();
  const h = now.getUTCHours();
  if (d === 6) return false;
  if (d === 5 && h >= 22) return false;
  if (d === 0 && h < 22) return false;
  return true;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-[17px] font-semibold">{value}</p>
    </div>
  );
}

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ s?: string; view?: string }> }) {
  const { s: sParam, view } = await searchParams;
  const symbol = marketOf(sParam ?? "")?.symbol ?? "XAUUSD";
  const [{ series, demo }, { data: signals }, { data: news }] = await Promise.all([getMarkets(), getSignals(100), getNews(30)]);
  const cur = series.find((x) => x.meta.symbol === symbol) as MarketSeries;
  const meta = cur.meta;
  const tech = technicals(cur.candles);
  const open = marketOpen(meta.category);
  const watch: WatchItem[] = series.map((x) => ({ symbol: x.meta.symbol, name: x.meta.name, digits: x.meta.digits, last: x.last, change: x.change, changePct: x.changePct }));
  const watchCat = series.map((x, k) => ({ ...watch[k], category: x.meta.category as string }));
  const related = (signals as Signal[]).filter((x) => x.symbol === symbol).slice(0, 6);
  const openSig = related.find((x) => !CLOSED_STATUSES.includes(x.status));
  const levels: ChartLevel[] = openSig
    ? [
        { price: Number(openSig.entry_price), title: DIRECTION_LABEL[openSig.direction], kind: "entry" },
        ...(openSig.stop_loss ? [{ price: Number(openSig.stop_loss), title: "SL", kind: "sl" as const }] : []),
        ...(openSig.take_profit_1 ? [{ price: Number(openSig.take_profit_1), title: "TP1", kind: "tp" as const }] : []),
      ]
    : [];
  const candles = cur.candles.map((c) => ({ ...c }));
  const range3w = { low: Math.min(...cur.candles.map((c) => c.low)), high: Math.max(...cur.candles.map((c) => c.high)) };
  const symNews = news.filter((n) => n.kind !== "calendar").slice(0, 6);
  const mobileMode = view === "chart" ? "chart" : sParam ? "symbol" : "watchlist";

  const header = (big: boolean) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SymbolLogo symbol={symbol} size={big ? 56 : 36} />
      <div className="min-w-0">
        <h1 className={cn("font-bold leading-tight", big ? "text-[28px] md:text-[32px]" : "text-lg")}>{meta.name}</h1>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="num rounded bg-secondary px-1.5 py-0.5 font-semibold text-foreground">{symbol}</span>
          <span>{CATEGORY_LABEL[meta.category]}</span>
          <span dir="ltr" className="hidden sm:inline">{meta.short}</span>
        </div>
      </div>
    </div>
  );
  const priceBlock = (big: boolean) => (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={cn("num font-bold leading-none", big ? "text-[40px] md:text-[44px]" : "text-[28px]")}>{fmtPrice(cur.last, meta.digits)}</span>
        <span className="text-sm text-muted-foreground">USD</span>
        <Change pct={cur.changePct} abs={cur.change} digits={meta.digits} className={big ? "text-lg" : "text-[15px]"} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", open ? "bg-success" : "bg-muted-foreground")} />
        {open ? "السوق مفتوح" : "السوق مغلق"} • آخر 24 ساعة{demo ? " • بيانات توضيحية" : ""}
      </p>
    </div>
  );

  const techBlock = (
    <section id="technicals" className="scroll-mt-28">
      <h2 className="mb-2 text-2xl font-bold">التحليل الفني لـ {symbol}</h2>
      <p className="mb-6 text-sm text-muted-foreground">ملخص لمؤشرات إطار الساعة — تعليمي وليس توصية.</p>
      <div className="grid grid-cols-1 items-end gap-8 md:grid-cols-3">
        <Gauge title="المذبذبات" value={tech.osc.value} rating={tech.osc.rating} counts={tech.osc} size={200} />
        <Gauge title="الملخص" value={tech.summary.value} rating={tech.summary.rating} size={260} />
        <Gauge title="المتوسطات المتحركة" value={tech.ma.value} rating={tech.ma.rating} counts={tech.ma} size={200} />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          ["المذبذبات", tech.osc.rows],
          ["المتوسطات المتحركة", tech.ma.rows],
        ].map(([title, rows]) => (
          <table key={title as string} className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-start font-medium">{title as string}</th>
                <th className="py-2 text-end font-medium">القيمة</th>
                <th className="py-2 text-end font-medium">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {(rows as typeof tech.osc.rows).map((r) => (
                <tr key={r.name} className="border-b border-border/60">
                  <td className="num py-2.5" dir="ltr" style={{ textAlign: "right" }}>{r.name}</td>
                  <td className="num py-2.5 text-end">{r.value === null ? "—" : r.value.toFixed(r.value > 100 ? 2 : r.value > 1 ? 2 : 5)}</td>
                  <td className={cn("py-2.5 text-end font-semibold", ratingTone(r.action === "buy" ? "buy" : r.action === "sell" ? "sell" : "neutral"))}>
                    {RATING_LABEL[r.action === "buy" ? "buy" : r.action === "sell" ? "sell" : "neutral"]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );

  const statsBlock = (
    <section id="overview" className="scroll-mt-28">
      <h2 className="mb-2 text-2xl font-bold">إحصائيات رئيسية</h2>
      <div className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
        <Stat label="الافتتاح (24س)" value={fmtPrice(cur.open24, meta.digits)} />
        <Stat label="أعلى سعر (24س)" value={fmtPrice(cur.high24, meta.digits)} />
        <Stat label="أدنى سعر (24س)" value={fmtPrice(cur.low24, meta.digits)} />
        <Stat label="التغير (24س)" value={<Change pct={cur.changePct} />} />
        <Stat label="أدنى 3 أسابيع" value={fmtPrice(range3w.low, meta.digits)} />
        <Stat label="أعلى 3 أسابيع" value={fmtPrice(range3w.high, meta.digits)} />
        <Stat label="الملخص الفني" value={<span className={ratingTone(tech.summary.rating)}>{RATING_LABEL[tech.summary.rating]}</span>} />
        <Stat label="الفئة" value={CATEGORY_LABEL[meta.category]} />
      </div>
    </section>
  );

  const ideasBlock = (
    <section id="ideas" className="scroll-mt-28">
      <h2 className="mb-4 text-2xl font-bold">التوصيات على {symbol}</h2>
      {related.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {related.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-3 text-sm">
              <span className={cn("rounded px-2 py-0.5 text-xs font-bold text-white", x.direction === "BUY" ? "bg-success" : "bg-destructive")}>{DIRECTION_LABEL[x.direction]}</span>
              <span className="num">@ {fmtPrice(Number(x.entry_price), meta.digits)}</span>
              <span className="text-muted-foreground">{STATUS_LABEL[x.status]}</span>
              {x.result_pips !== null && <span className={cn("num font-bold", Number(x.result_pips) >= 0 ? "text-up" : "text-down")}>{Number(x.result_pips) > 0 ? "+" : ""}{x.result_pips}</span>}
              <span className="ms-auto text-xs text-muted-foreground">{timeAgo(x.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">لا توصيات على هذا الرمز بعد — <Link href="/signals" className="text-primary">كل التوصيات</Link></p>
      )}
    </section>
  );

  const newsBlock = (
    <section id="news" className="scroll-mt-28">
      <h2 className="mb-4 text-2xl font-bold">الأخبار</h2>
      <ul className="divide-y divide-border border-y border-border">
        {symNews.map((n) => (
          <li key={n.id} className="py-3">
            <Link href="/feed" className="group block">
              <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)} • {n.source ?? "QFX"}</span>
              <span className="mt-0.5 block font-semibold leading-7 group-hover:text-primary">{n.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {/* ===================== سطح المكتب ===================== */}
      <div className="hidden md:block">
        <div className="container pt-6">
          <nav className="mb-4 flex items-center gap-1 text-[13px] text-muted-foreground">
            <Link href="/markets" className="hover:text-primary">الأسواق</Link>
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{CATEGORY_LABEL[meta.category]}</span>
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="num text-foreground">{symbol}</span>
          </nav>
          {header(true)}
          <div className="mt-5">{priceBlock(true)}</div>
          <div className="sticky top-16 z-20 mt-6 flex gap-1 border-b border-border bg-background">
            {[
              ["#chart", "الشارت"],
              ["#overview", "نظرة عامة"],
              ["#technicals", "الفنيات"],
              ["#ideas", "التوصيات"],
              ["#news", "الأخبار"],
            ].map(([h, l], k) => (
              <a key={h} href={h} className={cn("-mb-px border-b-2 px-4 py-3 text-[15px] font-semibold hover:text-primary", k === 0 ? "border-foreground" : "border-transparent text-muted-foreground")}>
                {l}
              </a>
            ))}
          </div>
        </div>
        <div className="container py-6">
          <div id="chart" className="grid h-[600px] scroll-mt-28 grid-cols-[minmax(0,1fr)_300px] overflow-hidden rounded-xl border border-border">
            <AdvancedChart symbol={symbol} candles={candles} digits={meta.digits} levels={levels} className="h-full" />
            <div className="min-w-0 border-s border-border">
              <WatchlistPanel items={watch} active={symbol} />
            </div>
          </div>
          <div className="mt-14 space-y-16">
            {statsBlock}
            {techBlock}
            <div className="grid grid-cols-2 gap-12">
              {ideasBlock}
              {newsBlock}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== الجوال (بأسلوب التطبيق) ===================== */}
      <div className="md:hidden">
        {mobileMode === "watchlist" && (
          <div>
            <div className="flex items-center justify-between px-4 pb-2 pt-5">
              <h1 className="text-[28px] font-bold">قائمة المراقبة</h1>
              <MobileSearchButton />
            </div>
            <WatchlistMobileFiltered items={watchCat} categories={CATEGORY_LABEL} />
            {demo && <p className="px-4 py-3 text-xs text-muted-foreground">أسعار توضيحية</p>}
          </div>
        )}

        {mobileMode === "chart" && (
          <div className="flex h-[calc(100dvh-64px-56px-env(safe-area-inset-bottom))] flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <SymbolLogo symbol={symbol} size={24} />
              <Link href={`/markets?s=${symbol}`} className="num font-bold">{symbol}</Link>
              <span className="num text-[15px] font-semibold">{fmtPrice(cur.last, meta.digits)}</span>
              <Change pct={cur.changePct} className="text-[13px]" />
              <MobileSearchButton className="ms-auto" />
            </div>
            <AdvancedChart symbol={symbol} candles={candles} digits={meta.digits} levels={levels} className="min-h-0 flex-1" compactToolbar />
          </div>
        )}

        {mobileMode === "symbol" && (
          <div className="space-y-8 pb-6">
            <div className="px-4 pt-4">
              {header(false)}
              <div className="mt-4">{priceBlock(false)}</div>
            </div>
            <div>
              <AdvancedChart symbol={symbol} candles={candles} digits={meta.digits} levels={levels} className="h-[380px] border-y border-border" compactToolbar />
              <Link href={`/markets?s=${symbol}&view=chart`} className="mx-4 mt-3 flex h-11 items-center justify-center rounded-lg bg-secondary text-[15px] font-semibold">
                فتح الشارت بملء الشاشة
              </Link>
            </div>
            <div className="space-y-10 px-4">
              {statsBlock}
              {techBlock}
              {ideasBlock}
              {newsBlock}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

