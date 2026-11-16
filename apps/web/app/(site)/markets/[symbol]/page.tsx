import { CLOSED_STATUSES, DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { KEYWORDS, ogImageUrl, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvancedChart, type ChartLevel } from "@/components/market/advanced-chart";
import { Gauge, ratingTone, RATING_LABEL } from "@/components/market/gauge";
import { fmtPrice } from "@/components/market/price";
import { LiveChange, LivePrice } from "@/components/market/live-quotes";
import { SymbolLogo } from "@/components/market/symbol-logo";
import { WatchlistPanel, type WatchItem } from "@/components/market/watchlist";
import { RememberSymbol } from "@/components/market/remember-symbol";
import { marketFaqs, MARKET_GUIDES } from "@/config/market-guides";
import { CATEGORY_LABEL, MARKETS, marketHref, marketOf } from "@/config/markets";
import { breadcrumbLd, faqLd, JsonLd } from "@/lib/jsonld";
import { getNews, getSignals } from "@/lib/data";
import { getMarkets, technicals, type MarketSeries } from "@/lib/market-data";
import { cn, timeAgo } from "@/lib/utils";
import { MobileSearchButton } from "../mobile-search";

export const revalidate = 300;

type Props = { params: Promise<{ symbol: string }>; searchParams: Promise<{ view?: string }> };

export function generateStaticParams() {
  return MARKETS.map((m) => ({ symbol: m.symbol.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = marketOf((await params).symbol);
  if (!m) return { title: "رمز غير موجود", robots: { index: false } };
  return pageMeta({
    title: `سعر ${m.name} الآن (${m.symbol}) — شارت وتحليل فني`,
    description: `سعر ${m.name} (${m.symbol}) مباشرة مع الشارت التفاعلي، التحليل الفني بالمتوسطات والمذبذبات، ما يحرّك السعر وأفضل أوقات التداول، وتوصيات QFX.`,
    path: marketHref(m.symbol),
    keywords: [`سعر ${m.name}`, `${m.symbol} مباشر`, `تحليل ${m.symbol}`, `توصيات ${m.symbol}`, ...KEYWORDS.markets.slice(0, 3)],
    image: ogImageUrl(`${m.symbol} — ${m.name}`, "الشارت والتحليل الفني والتوصيات"),
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

export default async function SymbolPage({ params, searchParams }: Props) {
  const [{ symbol: slug }, { view }] = await Promise.all([params, searchParams]);
  const found = marketOf(slug);
  if (!found || slug !== found.symbol.toLowerCase()) notFound();
  const symbol = found.symbol;
  const guide = MARKET_GUIDES[symbol];
  const faqs = marketFaqs(symbol, found.name);
  const [{ series, demo }, { data: signals }, { data: news }] = await Promise.all([getMarkets(), getSignals(100), getNews(30)]);
  const cur = series.find((x) => x.meta.symbol === symbol) as MarketSeries;
  const meta = cur.meta;
  const tech = technicals(cur.candles);
  const open = marketOpen(meta.category);
  const watch: WatchItem[] = series.map((x) => ({ symbol: x.meta.symbol, name: x.meta.name, digits: x.meta.digits, last: x.last, change: x.change, changePct: x.changePct }));
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
  const mobileMode = view === "chart" ? "chart" : "symbol";
  const relatedMarkets = (guide?.related ?? []).map((s) => series.find((x) => x.meta.symbol === s)).filter((x): x is MarketSeries => !!x);

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
        <span className={cn("num font-bold leading-none", big ? "text-[40px] md:text-[44px]" : "text-[28px]")}><LivePrice symbol={meta.symbol} value={cur.last} digits={meta.digits} /></span>
        <span className="text-sm text-muted-foreground">USD</span>
        <LiveChange symbol={meta.symbol} pct={cur.changePct} abs={cur.change} digits={meta.digits} className={big ? "text-lg" : "text-[15px]"} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", open ? "bg-success" : "bg-muted-foreground")} />
        {open ? "السوق مفتوح" : "السوق مغلق"} • آخر 24 ساعة{demo ? " • بيانات توضيحية" : ""}
      </p>
    </div>
  );

  const techBlock = (withIds = true) => (
    <section id={withIds ? "technicals" : undefined} className="scroll-mt-28">
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

  const statsBlock = (withIds = true) => (
    <section id={withIds ? "overview" : undefined} className="scroll-mt-28">
      <h2 className="mb-2 text-2xl font-bold">إحصائيات رئيسية</h2>
      <div className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
        <Stat label="الافتتاح (24س)" value={fmtPrice(cur.open24, meta.digits)} />
        <Stat label="أعلى سعر (24س)" value={fmtPrice(cur.high24, meta.digits)} />
        <Stat label="أدنى سعر (24س)" value={fmtPrice(cur.low24, meta.digits)} />
        <Stat label="التغير (24س)" value={<LiveChange symbol={meta.symbol} pct={cur.changePct} />} />
        <Stat label="أدنى 3 أسابيع" value={fmtPrice(range3w.low, meta.digits)} />
        <Stat label="أعلى 3 أسابيع" value={fmtPrice(range3w.high, meta.digits)} />
        <Stat label="الملخص الفني" value={<span className={ratingTone(tech.summary.rating)}>{RATING_LABEL[tech.summary.rating]}</span>} />
        <Stat label="الفئة" value={CATEGORY_LABEL[meta.category]} />
      </div>
    </section>
  );

  const ideasBlock = (withIds = true) => (
    <section id={withIds ? "ideas" : undefined} className="scroll-mt-28">
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

  const newsBlock = (withIds = true) => (
    <section id={withIds ? "news" : undefined} className="scroll-mt-28">
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

  const guideBlock = (withIds = true) => guide ? (
    <section id={withIds ? "guide" : undefined} className="scroll-mt-28">
      <h2 className="mb-4 text-2xl font-bold">دليل {found.name}</h2>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <p className="text-[16px] leading-8">{guide.about}</p>
          <div>
            <h3 className="mb-3 text-lg font-bold">ما الذي يحرّك سعر {symbol}؟</h3>
            <ul className="space-y-2.5">
              {guide.drivers.map((d) => (
                <li key={d} className="flex gap-3 text-[15px] leading-7">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">أسئلة شائعة</h3>
            <div className="border-t border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-border py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-6 lg:self-start">
          <div className="rounded-xl bg-surface p-5">
            <h3 className="mb-3 font-bold">مواصفات سريعة</h3>
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">أفضل الأوقات</dt><dd className="max-w-[65%] text-end">{guide.sessions}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">النقطة</dt><dd className="text-end">{guide.pip}</dd></div>
              <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">حجم العقد</dt><dd className="text-end">{guide.contract}</dd></div>
            </dl>
          </div>
          {relatedMarkets.length > 0 && (
            <div>
              <h3 className="mb-3 font-bold">أسواق مرتبطة</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {relatedMarkets.map((x) => (
                  <li key={x.meta.symbol}>
                    <Link href={marketHref(x.meta.symbol)} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                      <SymbolLogo symbol={x.meta.symbol} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="num block font-semibold">{x.meta.symbol}</span>
                        <span className="block truncate text-xs text-muted-foreground">{x.meta.name}</span>
                      </span>
                      <span className="text-end">
                        <LivePrice symbol={x.meta.symbol} value={x.last} digits={x.meta.digits} className="num block text-sm font-semibold" />
                        <LiveChange symbol={x.meta.symbol} pct={x.changePct} className="text-xs" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  ) : null;

  return (
    <>
      <JsonLd data={[breadcrumbLd([["الرئيسية", "/"], ["الأسواق", "/markets"], [found.name, marketHref(symbol)]]), ...(faqs.length ? [faqLd(faqs)] : [])]} />
      <RememberSymbol symbol={symbol} />
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
              ["#guide", "دليل الرمز"],
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
            {statsBlock()}
            {techBlock()}
            {guideBlock()}
            <div className="grid grid-cols-2 gap-12">
              {ideasBlock()}
              {newsBlock()}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== الجوال (بأسلوب التطبيق) ===================== */}
      <div className="md:hidden">
        {mobileMode === "chart" && (
          <div className="flex h-[calc(100dvh-64px-56px-env(safe-area-inset-bottom))] flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <SymbolLogo symbol={symbol} size={24} />
              <Link href={marketHref(symbol)} className="num font-bold">{symbol}</Link>
              <LivePrice symbol={meta.symbol} value={cur.last} digits={meta.digits} className="num text-[15px] font-semibold" />
              <LiveChange symbol={meta.symbol} pct={cur.changePct} className="text-[13px]" />
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
              <AdvancedChart symbol={symbol} candles={candles} digits={meta.digits} levels={levels} className="h-[60dvh] min-h-[380px] border-y border-border" compactToolbar />
              <Link href={marketHref(symbol, "chart")} className="mx-4 mt-3 flex h-11 items-center justify-center rounded-lg bg-secondary text-[15px] font-semibold">
                فتح الشارت بملء الشاشة
              </Link>
            </div>
            <div className="space-y-10 px-4">
              {statsBlock(false)}
              {techBlock(false)}
              {ideasBlock(false)}
              {guideBlock(false)}
              {newsBlock(false)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

