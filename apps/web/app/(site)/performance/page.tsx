import { DIRECTION_LABEL } from "@qfx/shared";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SymbolLogo } from "@/components/market/symbol-logo";
import { PageTitle } from "@/components/page-title";
import { EquityCurve } from "@/components/performance/equity-curve";
import { buttonVariants } from "@/components/ui/button";
import { marketHref, marketOf } from "@/config/markets";
import { siteConfig } from "@/config/site";
import { getSignals } from "@/lib/data";
import { breadcrumbLd, JsonLd } from "@/lib/jsonld";
import { computePerformance, demoHistory } from "@/lib/performance";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = pageMeta({
  title: "سجل الأداء — نتائج كل توصيات QFX",
  description: "منحنى النقاط التراكمي، الأداء الشهري، نسبة النجاح لكل رمز، أقصى تراجع، وأفضل وأسوأ صفقة — سجل كامل لكل التوصيات الرابحة والخاسرة.",
  path: "/performance",
  keywords: "signals",
});

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;
const dateAr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" }) : "—");

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone?: "up" | "down"; hint?: string }) {
  return (
    <div className="border-b border-border py-4" title={hint}>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className={cn("num mt-1 whitespace-nowrap text-[clamp(18px,5.5vw,24px)] font-bold md:text-[28px]", tone === "up" && "text-up", tone === "down" && "text-down")} style={{ textAlign: "right" }}>
        {value}
      </p>
    </div>
  );
}

export default async function PerformancePage() {
  const { data, demo } = await getSignals(2000);
  const p = computePerformance(demo ? [...data, ...demoHistory()] : data);
  const maxMonth = Math.max(1, ...p.monthly.map((m) => Math.abs(m.pips)));
  const myfxbook = process.env.NEXT_PUBLIC_MYFXBOOK_URL;

  return (
    <div className="container space-y-12 py-8 md:py-12">
      <JsonLd data={breadcrumbLd([["الرئيسية", "/"], ["التوصيات", "/signals"], ["سجل الأداء", "/performance"]])} />
      <PageTitle
        title="سجل الأداء"
        text={`كل توصية منشورة منذ ${dateAr(p.first)} — الرابحة والخاسرة — بلا حذف أو انتقاء. النتائج بالنقاط وقبل العمولات والسبريد.`}
      >
        <Link href="/signals" className={buttonVariants({ variant: "outline", size: "pill" })}>
          التوصيات الحية <ArrowLeft className="h-4 w-4" />
        </Link>
      </PageTitle>

      {demo && (
        <p className="flex items-center gap-2 rounded-lg bg-gold/10 px-4 py-2.5 text-sm text-gold">
          <Info className="h-4 w-4 shrink-0" /> بيانات توضيحية — يظهر السجل الحقيقي تلقائياً بعد ربط قاعدة البيانات.
        </p>
      )}

      {p.trades === 0 ? (
        <p className="py-16 text-center text-muted-foreground">لا توجد توصيات مغلقة بعد — سيظهر السجل هنا مع أول صفقة مغلقة.</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-x-8 md:grid-cols-4">
            <Kpi label="مجموع النقاط" value={signed(p.totalPips)} tone={p.totalPips >= 0 ? "up" : "down"} />
            <Kpi label="نسبة النجاح" value={p.winRate === null ? "—" : `${p.winRate}%`} />
            <Kpi label="عدد الصفقات" value={`${p.trades}`} hint={`${p.wins} رابحة / ${p.losses} خاسرة`} />
            <Kpi label="معامل الربح" value={p.profitFactor === null ? "—" : `${p.profitFactor}`} hint="مجموع الأرباح ÷ مجموع الخسائر" />
            <Kpi label="أقصى تراجع" value={`-${p.maxDrawdown.toLocaleString("en-US")}`} tone="down" hint="أكبر هبوط من قمة الرصيد بالنقاط" />
            <Kpi label="متوسط الربح / الخسارة" value={`${signed(p.avgWin)} / ${p.avgLoss}`} />
            <Kpi label="متوسط العائد/المخاطرة" value={p.avgRR === null ? "—" : `1:${p.avgRR}`} />
            <Kpi label="أطول سلسلة ربح" value={`${p.longestWinStreak}`} hint={`أطول سلسلة خسارة: ${p.longestLossStreak}`} />
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-2xl font-bold">منحنى النقاط التراكمي</h2>
              <p className="text-sm text-muted-foreground">
                من {dateAr(p.first)} إلى {dateAr(p.last)}
              </p>
            </div>
            <div className="glass-card rounded-xl border border-border p-2">
              <EquityCurve points={p.equity} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-2xl font-bold">الأداء الشهري</h2>
              <table className="w-full text-[14px]">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr className="[&>th]:py-2.5 [&>th]:font-medium">
                    <th className="text-start">الشهر</th>
                    <th className="text-end">الصفقات</th>
                    <th className="text-end">النجاح</th>
                    <th className="w-[38%] text-end">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {p.monthly.map((m) => (
                    <tr key={m.month} className="border-b border-border/60 [&>td]:py-3">
                      <td className="font-semibold">{monthName(m.month)}</td>
                      <td className="num text-end">{m.trades}</td>
                      <td className="num text-end">{m.winRate === null ? "—" : `${m.winRate}%`}</td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <span className="h-2 rounded-full" style={{ width: `${(Math.abs(m.pips) / maxMonth) * 60}%`, background: m.pips >= 0 ? "var(--chart-up)" : "var(--chart-down)" }} />
                          <span className={cn("num w-16 text-end font-bold", m.pips >= 0 ? "text-up" : "text-down")}>{signed(m.pips)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-bold">حسب الرمز</h2>
              <table className="w-full text-[14px]">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr className="[&>th]:py-2.5 [&>th]:font-medium">
                    <th className="text-start">الرمز</th>
                    <th className="text-end">الصفقات</th>
                    <th className="text-end">النجاح</th>
                    <th className="text-end">المتوسط</th>
                    <th className="text-end">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {p.bySymbol.map((s) => {
                    const known = marketOf(s.symbol);
                    const cell = (
                      <span className="flex items-center gap-2">
                        <SymbolLogo symbol={s.symbol} size={22} />
                        <span className="num font-semibold">{s.symbol}</span>
                      </span>
                    );
                    return (
                      <tr key={s.symbol} className="border-b border-border/60 [&>td]:py-3">
                        <td>{known ? <Link href={marketHref(known.symbol)} className="hover:text-primary">{cell}</Link> : cell}</td>
                        <td className="num text-end">{s.trades}</td>
                        <td className="num text-end">{s.winRate === null ? "—" : `${s.winRate}%`}</td>
                        <td className={cn("num text-end", s.avg >= 0 ? "text-up" : "text-down")}>{signed(s.avg)}</td>
                        <td className={cn("num text-end font-bold", s.pips >= 0 ? "text-up" : "text-down")}>{signed(s.pips)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["أفضل صفقة", p.best, "up"],
              ["أسوأ صفقة", p.worst, "down"],
            ].map(([label, s, tone]) =>
              s && typeof s === "object" ? (
                <div key={label as string} className="flex items-center gap-4 rounded-xl bg-surface p-5">
                  <SymbolLogo symbol={s.symbol} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="mt-0.5 font-bold">
                      <span className="num">{s.symbol}</span> — {DIRECTION_LABEL[s.direction]} • {dateAr(s.closed_at)}
                    </p>
                  </div>
                  <span className={cn("num text-2xl font-bold", tone === "up" ? "text-up" : "text-down")}>{signed(Number(s.result_pips))}</span>
                </div>
              ) : null,
            )}
          </section>
        </>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border p-6">
          <h2 className="mb-3 text-lg font-bold">كيف نحسب النتائج؟</h2>
          <ul className="space-y-2 text-[15px] leading-7 text-muted-foreground">
            <li>• كل توصية تُسجَّل لحظة نشرها في القناة بالدخول والوقف والأهداف، ولا تُحذف بعد ذلك.</li>
            <li>• تُحتسب النتيجة بالنقاط عند ضرب الهدف أو الوقف أو الإغلاق اليدوي، والتوصيات الملغاة قبل التفعيل مستبعدة.</li>
            <li>• النتائج قبل العمولات وفروقات الأسعار (السبريد)، وتختلف نتيجتك حسب حجم صفقتك وتوقيت دخولك.</li>
            <li>• الأداء السابق لا يضمن النتائج المستقبلية. <Link href="/risk" className="text-primary underline">إفصاح المخاطر</Link></li>
          </ul>
        </div>
        <div className="glass-card flex flex-col justify-between gap-4 rounded-xl bg-panel p-6 text-panel-foreground">
          <div>
            <p className="text-lg font-bold">تابع التوصيات القادمة لحظة صدورها</p>
            <p className="mt-1 text-sm text-panel-muted">افتح حسابك عبر الوكالة وانضم لقناة العملاء على تيليجرام.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
              افتح حسابك
            </a>
            {myfxbook && /^https:\/\//.test(myfxbook) && (
              <a href={myfxbook} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-1.5 rounded-pill px-5 text-sm font-semibold ring-1 ring-panel-foreground/30 hover:bg-panel-foreground/10">
                حساب موثّق على Myfxbook <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
