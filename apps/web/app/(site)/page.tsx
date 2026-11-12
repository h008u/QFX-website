import { CLOSED_STATUSES, NEWS_KIND_LABEL } from "@qfx/shared";
import { BadgeCheck, ChevronLeft, LineChart, Percent, ShieldCheck, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { HeroSearch } from "@/components/landing/hero-search";
import { LeadForm } from "@/components/landing/lead-form";
import { Steps } from "@/components/landing/steps";
import { IdeaCard } from "@/components/market/idea-card";
import { MarketSummary, type SummaryItem } from "@/components/market/market-summary";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getNews, getSignalStats, getSignals } from "@/lib/data";
import { getMarkets } from "@/lib/market-data";
import { cn, timeAgo } from "@/lib/utils";

export const revalidate = 1800;

const WHY = [
  { icon: ShieldCheck, title: "وسطاء مرخّصون", text: "حسابك وأموالك لدى شركة وساطة خاضعة للرقابة، ونحن نرافقك بالدعم والمحتوى." },
  { icon: Percent, title: "مزايا لعملاء الوكالة", text: "شروط تداول تنافسية واسترداد جزء من العمولات حسب حجم تداولك." },
  { icon: LineChart, title: "توصيات بسجل حقيقي", text: "كل صفقة مسجّلة بالدخول والوقف والأهداف ونتيجتها — رابحة كانت أو خاسرة." },
  { icon: Users, title: "مجتمع عربي", text: "تحليلات يومية ونقاش منظم حول الذهب والعملات والنفط." },
];

function SectionTitle({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group mb-6 inline-flex items-center gap-1 text-[28px] font-bold leading-tight md:text-[34px]">
      {children}
      <ChevronLeft className="h-7 w-7 transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}

export default async function HomePage() {
  const [{ series, demo }, { data: signals }, { data: stats }, { data: news }] = await Promise.all([getMarkets(), getSignals(12), getSignalStats(), getNews(8)]);
  const items: SummaryItem[] = series.map((s) => ({
    symbol: s.meta.symbol,
    name: s.meta.name,
    category: s.meta.category,
    digits: s.meta.digits,
    last: s.last,
    change: s.change,
    changePct: s.changePct,
    candles: s.candles.slice(-300),
    spark: s.candles.slice(-48).map((c) => c.close),
  }));
  const bySym = new Map(series.map((s) => [s.meta.symbol, s]));
  const ideas = signals.slice(0, 6);

  return (
    <>
      {/* ===== البطل: خلفية داكنة وعنوان ضخم وبحث كبير ===== */}
      <section className="hero-section relative overflow-hidden bg-hero text-hero-foreground">
        <svg className="hero-art absolute inset-0 h-full w-full opacity-60" viewBox="0 0 1440 640" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="hero-g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 520 L120 470 L220 495 L340 400 L460 430 L580 330 L700 360 L820 250 L940 290 L1060 190 L1180 220 L1300 120 L1440 150 L1440 640 L0 640Z" fill="url(#hero-g)" />
          <path d="M0 520 L120 470 L220 495 L340 400 L460 430 L580 330 L700 360 L820 250 L940 290 L1060 190 L1180 220 L1300 120 L1440 150" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <div className="container relative flex min-h-[560px] flex-col justify-center py-20 md:min-h-[640px]">
          <h1 className="max-w-4xl text-[52px] font-black leading-[1.12] tracking-tight md:text-[88px]">
            حلّل أولاً.
            <br />
            <span className="brand-accent">ثم تداول بثقة.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-hero-muted md:text-xl">{siteConfig.description}</p>
          <div className="mt-10">
            <HeroSearch />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
              افتح حسابك عبر الوكالة
            </a>
            <Link href="/signals" className="inline-flex h-11 items-center rounded-pill px-6 text-[15px] font-semibold text-hero-foreground ring-1 ring-hero-foreground/30 hover:bg-hero-foreground/10">
              سجل التوصيات
            </Link>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-hero-foreground/15 pt-6">
            {[
              [stats.win_rate === null ? "—" : `${stats.win_rate}%`, "نسبة نجاح التوصيات"],
              [`${stats.total_pips > 0 ? "+" : ""}${stats.total_pips}`, "مجموع النقاط"],
              [String(stats.total), "توصية منشورة"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-xs text-hero-muted md:text-sm">{l}</dt>
                <dd className="num mt-1 text-2xl font-bold md:text-3xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container space-y-20 py-14 md:space-y-24 md:py-20">
        <div>
          <MarketSummary items={items} />
          {demo && <p className="mt-3 text-xs text-muted-foreground">أسعار توضيحية — تظهر الأسعار الحقيقية بعد إضافة مفتاح البيانات.</p>}
        </div>

        {/* ===== التوصيات بشكل بطاقات الأفكار ===== */}
        <section>
          <SectionTitle href="/signals">أحدث التوصيات</SectionTitle>
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {ideas.map((s) => {
              const m = bySym.get(s.symbol);
              return (
                <div key={s.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
                  <IdeaCard signal={s} spark={(m?.candles ?? []).slice(-60).map((c) => c.close)} digits={m?.meta.digits ?? 5} />
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== أهم الأخبار ===== */}
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <SectionTitle href="/feed">أهم الأخبار والتحليلات</SectionTitle>
            <ul className="divide-y divide-border border-y border-border">
              {news.map((n) => (
                <li key={n.id}>
                  <Link href="/feed" className="group flex gap-4 py-4">
                    <span className="w-24 shrink-0 pt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-semibold leading-7 group-hover:text-primary">{n.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {NEWS_KIND_LABEL[n.kind]}
                        {n.currency ? ` • ${n.currency}` : ""}
                        {n.impact === "high" ? " • 🔴 تأثير مرتفع" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <aside className="glass-card rounded-2xl bg-panel p-8 text-panel-foreground lg:self-start">
            <Zap className="h-8 w-8 text-panel-accent" />
            <p className="mt-4 text-2xl font-bold leading-snug">التوصيات والأخبار القوية تصلك على تيليجرام فور صدورها</p>
            <p className="mt-3 text-sm leading-7 text-panel-muted">تنبيه قبل الخبر الاقتصادي القوي، وأجندة يومية، وتحديثات الصفقات كرد على رسالتها.</p>
            <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={cn(buttonVariants({ size: "pill" }), "mt-6")}>
              انضم للقناة
            </a>
          </aside>
        </section>

        {/* ===== لماذا الوكالة ===== */}
        <section>
          <h2 className="mb-8 text-[28px] font-bold md:text-[34px]">لماذا تتداول عبر QFX؟</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-2xl bg-surface p-6">
                <w.icon className="h-7 w-7 text-primary" />
                <p className="mt-5 text-lg font-bold">{w.title}</p>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{w.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-border p-6 md:p-8">
            <p className="text-sm font-semibold text-primary">شريكنا في الوساطة</p>
            <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-2xl font-bold">{siteConfig.brokerName}</p>
              <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill", variant: "gold" })}>
                التسجيل عبر رابط الوكالة
              </a>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              نحن وكيل معرّف: نعرّفك على الوسيط ونرافقك بالدعم والتعليم والتوصيات، بينما يتولى الوسيط المرخّص حفظ الأموال وتنفيذ الصفقات. لا نطلب منك أبداً إرسال أموال إلينا.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-8 text-[28px] font-bold md:text-[34px]">انضم في أربع خطوات</h2>
          <Steps />
        </section>

        {/* ===== الانضمام ===== */}
        <section id="join" className="scroll-mt-24">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
            <div className="glass-card bg-panel p-8 text-panel-foreground md:p-12">
              <BadgeCheck className="h-9 w-9 text-panel-accent" />
              <h2 className="mt-5 text-3xl font-bold leading-tight md:text-4xl">جاهز للانضمام؟</h2>
              <p className="mt-4 leading-8 text-panel-muted">سجّل حسابك عبر رابط الوكالة، ثم أرسل بياناتك لنفعّل اشتراكك في قناة العملاء.</p>
              <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={cn(buttonVariants({ size: "pill" }), "mt-8")}>
                1. افتح الحساب
              </a>
            </div>
            <div className="p-8 md:p-12">
              <h3 className="mb-6 text-xl font-bold">2. أرسل بيانات التفعيل</h3>
              <Suspense>
                <LeadForm />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
