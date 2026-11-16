import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ratingTone, RATING_LABEL } from "@/components/market/gauge";
import { Sparkline } from "@/components/market/sparkline";
import { SymbolLogo } from "@/components/market/symbol-logo";
import { WatchlistMobileFiltered } from "@/components/market/watchlist-filter";
import { PageTitle } from "@/components/page-title";
import { CATEGORY_LABEL, marketHref, marketOf, type MarketCategory } from "@/config/markets";
import { breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { getMarkets, technicals } from "@/lib/market-data";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { MobileSearchButton } from "./mobile-search";
import { LiveChange, LivePrice } from "@/components/market/live-quotes";
import { fmtPrice } from "@/components/market/price";

export const revalidate = 300;

export const metadata: Metadata = pageMeta({
  title: "الأسواق — أسعار الذهب والعملات والنفط والكريبتو مباشرة",
  description: "أسعار الذهب والعملات والنفط والعملات الرقمية مع التغير اليومي وأعلى وأدنى سعر والملخص الفني لكل سوق.",
  path: "/markets",
  keywords: "markets",
});

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ s?: string; view?: string }> }) {
  const { s, view } = await searchParams;
  // الروابط القديمة ?s=XAUUSD تتحوّل نهائياً للرابط الثابت (يحفظ ترتيبها في محركات البحث)
  if (s) {
    const m = marketOf(s);
    if (m) permanentRedirect(marketHref(m.symbol, view === "chart" ? "chart" : undefined));
  }
  const { series, demo } = await getMarkets();
  const rows = series.map((x) => ({ x, tech: technicals(x.candles).summary.rating }));
  const cats = [...new Set(series.map((x) => x.meta.category))] as MarketCategory[];
  const watch = series.map((x) => ({ symbol: x.meta.symbol, name: x.meta.name, digits: x.meta.digits, last: x.last, change: x.change, changePct: x.changePct, category: x.meta.category as string }));
  const movers = [...series].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 4);

  return (
    <>
      <JsonLd data={breadcrumbLd([["الرئيسية", "/"], ["الأسواق", "/markets"]])} />
      {/* ===================== سطح المكتب ===================== */}
      <div className="container hidden space-y-10 py-10 md:block">
        <PageTitle title="الأسواق" text="أسعار مباشرة مع التغير اليومي والملخص الفني — اختر أي سوق لفتح الشارت والتحليل الكامل." />

        <section>
          <h2 className="mb-4 text-xl font-bold">الأكثر حركة اليوم</h2>
          <div className="grid grid-cols-4 gap-4">
            {movers.map((x) => (
              <Link key={x.meta.symbol} href={marketHref(x.meta.symbol)} className="glass-card group rounded-xl border border-border p-4 transition-colors hover:border-primary">
                <div className="flex items-center gap-2.5">
                  <SymbolLogo symbol={x.meta.symbol} size={28} />
                  <span className="num font-bold group-hover:text-primary">{x.meta.symbol}</span>
                  <LiveChange symbol={x.meta.symbol} pct={x.changePct} chip className="ms-auto text-xs" />
                </div>
                <p className="num mt-3 text-xl font-bold"><LivePrice symbol={x.meta.symbol} value={x.last} digits={x.meta.digits} /></p>
                <Sparkline values={x.candles.slice(-48).map((c) => c.close)} up={x.changePct >= 0} width={260} height={44} />
              </Link>
            ))}
          </div>
        </section>

        {cats.map((c) => (
          <section key={c}>
            <h2 className="mb-3 text-xl font-bold">{CATEGORY_LABEL[c]}</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-[14px]">
                <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
                  <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                    <th className="text-start">الرمز</th>
                    <th className="text-end">السعر</th>
                    <th className="text-end">التغير %</th>
                    <th className="text-end">التغير</th>
                    <th className="text-end">أعلى (24س)</th>
                    <th className="text-end">أدنى (24س)</th>
                    <th className="text-center">آخر 48 ساعة</th>
                    <th className="text-end">الملخص الفني</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter(({ x }) => x.meta.category === c)
                    .map(({ x, tech }) => (
                      <tr key={x.meta.symbol} className="group relative border-b border-border/60 last:border-0 hover:bg-secondary/50 [&>td]:px-4 [&>td]:py-3">
                        <td>
                          <Link href={marketHref(x.meta.symbol)} className="flex items-center gap-3 after:absolute after:inset-0">
                            <SymbolLogo symbol={x.meta.symbol} size={30} />
                            <span>
                              <span className="num block font-bold group-hover:text-primary">{x.meta.symbol}</span>
                              <span className="block text-xs text-muted-foreground">{x.meta.name}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="num text-end font-semibold"><LivePrice symbol={x.meta.symbol} value={x.last} digits={x.meta.digits} /></td>
                        <td className="text-end"><LiveChange symbol={x.meta.symbol} pct={x.changePct} chip className="text-xs" /></td>
                        <td className={cn("num text-end", x.change >= 0 ? "text-up" : "text-down")}>{x.change >= 0 ? "+" : ""}{fmtPrice(x.change, x.meta.digits)}</td>
                        <td className="num text-end text-muted-foreground">{fmtPrice(x.high24, x.meta.digits)}</td>
                        <td className="num text-end text-muted-foreground">{fmtPrice(x.low24, x.meta.digits)}</td>
                        <td className="w-[150px]"><Sparkline values={x.candles.slice(-48).map((k) => k.close)} up={x.changePct >= 0} width={140} height={32} /></td>
                        <td className={cn("text-end font-semibold", ratingTone(tech))}>{RATING_LABEL[tech]}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {demo && <p className="text-xs text-muted-foreground">أسعار توضيحية — تعذّر الوصول لمصدر الأسعار مؤقتاً.</p>}
      </div>

      {/* ===================== الجوال: قائمة المراقبة ===================== */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-5">
          <h1 className="text-[28px] font-bold">قائمة المراقبة</h1>
          <MobileSearchButton />
        </div>
        <WatchlistMobileFiltered items={watch} categories={CATEGORY_LABEL} />
        {demo && <p className="px-4 py-3 text-xs text-muted-foreground">أسعار توضيحية</p>}
      </div>
    </>
  );
}
