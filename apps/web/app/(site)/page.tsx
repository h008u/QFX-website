import { CLOSED_STATUSES, NEWS_KIND_LABEL } from "@qfx/shared";
import { BadgeCheck, ChevronLeft, Zap } from "lucide-react";
import { EditableSections, EditableText } from "@/components/site-editor/editor";
import { WhyGrid } from "@/components/landing/why-grid";
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

function SectionTitle({ href, k }: { href: string; k: string }) {
  return (
    <Link href={href} className="group mb-6 inline-flex items-center gap-1 text-[28px] font-bold leading-tight md:text-[34px]">
      <EditableText k={k} />
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

  const hero = (
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
          <EditableText k="hero.title1" />
          <br />
          <EditableText k="hero.title2" className="brand-accent" />
        </h1>
        <EditableText as="p" k="hero.subtitle" multiline className="mt-6 block max-w-xl text-lg leading-8 text-hero-muted md:text-xl" />
        <div className="mt-10">
          <HeroSearch />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
            <EditableText k="hero.cta1" />
          </a>
          <Link href="/signals" className="inline-flex h-11 items-center rounded-pill px-6 text-[15px] font-semibold text-hero-foreground ring-1 ring-hero-foreground/30 hover:bg-hero-foreground/10">
            <EditableText k="hero.cta2" />
          </Link>
        </div>
        <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-hero-foreground/15 pt-6">
          {[
            [stats.win_rate === null ? "—" : `${stats.win_rate}%`, "hero.stat1"],
            [`${stats.total_pips > 0 ? "+" : ""}${stats.total_pips}`, "hero.stat2"],
            [String(stats.total), "hero.stat3"],
          ].map(([v, k]) => (
            <div key={k}>
              <dt className="text-xs text-hero-muted md:text-sm">
                <EditableText k={k} />
              </dt>
              <dd className="num mt-1 text-2xl font-bold md:text-3xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );

  const market = (
    <div className="container pt-14 md:pt-20">
      <MarketSummary items={items} title={<EditableText k="market.title" />} />
      {demo && <p className="mt-3 text-xs text-muted-foreground">أسعار توضيحية — تظهر الأسعار الحقيقية بعد إضافة مفتاح البيانات.</p>}
    </div>
  );

  const ideasNode = (
    <section className="container pt-16 md:pt-24">
      <SectionTitle href="/signals" k="ideas.title" />
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
  );

  const newsNode = (
    <section className="container grid grid-cols-1 gap-10 pt-16 md:pt-24 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <SectionTitle href="/feed" k="news.title" />
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
        <EditableText as="p" k="telegram.title" multiline className="mt-4 block text-2xl font-bold leading-snug" />
        <EditableText as="p" k="telegram.text" multiline className="mt-3 block text-sm leading-7 text-panel-muted" />
        <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={cn(buttonVariants({ size: "pill" }), "mt-6")}>
          <EditableText k="telegram.cta" />
        </a>
      </aside>
    </section>
  );

  const why = (
    <section className="container pt-16 md:pt-24">
      <EditableText as="h2" k="why.title" className="mb-8 block text-[28px] font-bold md:text-[34px]" />
      <WhyGrid />
    </section>
  );

  const broker = (
    <section className="container pt-10">
      <div className="rounded-2xl border border-border p-6 md:p-8">
        <EditableText as="p" k="broker.kicker" className="kicker block text-sm font-semibold text-primary" />
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-2xl font-bold">{siteConfig.brokerName}</p>
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill", variant: "gold" })}>
            <EditableText k="broker.cta" />
          </a>
        </div>
        <EditableText as="p" k="broker.text" multiline className="mt-3 block max-w-3xl text-sm leading-7 text-muted-foreground" />
      </div>
    </section>
  );

  const stepsNode = (
    <section className="container pt-16 md:pt-24">
      <EditableText as="h2" k="steps.title" className="mb-8 block text-[28px] font-bold md:text-[34px]" />
      <Steps />
    </section>
  );

  const join = (
    <section id="join" className="container scroll-mt-24 pt-16 md:pt-24">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
        <div className="glass-card bg-panel p-8 text-panel-foreground md:p-12">
          <BadgeCheck className="h-9 w-9 text-panel-accent" />
          <EditableText as="h2" k="join.title" className="mt-5 block text-3xl font-bold leading-tight md:text-4xl" />
          <EditableText as="p" k="join.text" multiline className="mt-4 block leading-8 text-panel-muted" />
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={cn(buttonVariants({ size: "pill" }), "mt-8")}>
            <EditableText k="join.cta" />
          </a>
        </div>
        <div className="p-8 md:p-12">
          <EditableText as="h3" k="join.formTitle" className="mb-6 block text-xl font-bold" />
          <Suspense>
            <LeadForm />
          </Suspense>
        </div>
      </div>
    </section>
  );

  return (
    <div className="pb-16 md:pb-24">
      <EditableSections nodes={{ hero, market, ideas: ideasNode, news: newsNode, why, broker, steps: stepsNode, join }} />
    </div>
  );
}
