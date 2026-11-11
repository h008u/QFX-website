import {
  BookOpen,
  CalendarClock,
  Headphones,
  LineChart,
  Percent,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LeadForm } from "@/components/landing/lead-form";
import { Steps } from "@/components/landing/steps";
import { SectionHeading } from "@/components/section-heading";
import { PriceChart } from "@/components/markets/price-chart";
import { StatsCards } from "@/components/signals/stats-cards";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getSignalStats, getSignals } from "@/lib/data";
import { getMarkets } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { CLOSED_STATUSES, DIRECTION_LABEL } from "@qfx/shared";

export const revalidate = 300;

const features = [
  { icon: ShieldCheck, title: "وسطاء مرخّصون", text: "نعمل فقط مع شركات وساطة خاضعة لجهات رقابية معروفة، وأموالك تبقى في حسابك لدى الوسيط." },
  { icon: Percent, title: "مزايا حصرية للعملاء", text: "شروط تداول تنافسية واسترداد جزء من العمولات (Cashback) لعملاء الوكالة حسب حجم التداول." },
  { icon: LineChart, title: "توصيات بسجل شفاف", text: "كل توصية تُسجّل بنقاط الدخول والوقف والأهداف ونتيجتها، ويمكنك مراجعة السجل كاملاً." },
  { icon: CalendarClock, title: "أخبار المفكرة بالعربية", text: "تنبيهات آلية بأهم الأخبار عالية التأثير مترجمة للعربية قبل صدورها." },
  { icon: Users, title: "مجتمع تداول عربي", text: "تحليلات يومية للعملات والذهب والنفط ونقاش منظم مع متداولين آخرين." },
  { icon: Headphones, title: "دعم بالعربية", text: "مساعدة في فتح الحساب والتوثيق والإيداع والسحب عبر تيليجرام وواتساب." },
];

export default async function HomePage() {
  const [{ data: stats, demo }, { data: signals }, markets] = await Promise.all([
    getSignalStats(),
    getSignals(20),
    getMarkets(),
  ]);
  const hero = markets.series[0];
  const heroSignal = signals.find((s) => s.symbol === hero?.symbol.symbol && !CLOSED_STATUSES.includes(s.status));
  const heroLines = heroSignal
    ? [
        { price: Number(heroSignal.entry_price), title: `${DIRECTION_LABEL[heroSignal.direction]}`, kind: "entry" as const },
        { price: Number(heroSignal.stop_loss), title: "SL", kind: "sl" as const },
        { price: Number(heroSignal.take_profit_1), title: "TP1", kind: "tp" as const },
      ]
    : [];

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="container relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> وكيل معرّف (IB) معتمد
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.3] md:text-6xl md:leading-[1.25]">
              تداول بثقة مع <span className="text-gradient">وسيط مرخّص</span> ومجتمع يدعمك
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{siteConfig.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "lg" })}>
                افتح حسابك الآن
              </a>
              <Link href="/signals" className={buttonVariants({ size: "lg", variant: "outline" })}>
                شاهد سجل التوصيات
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">التداول ينطوي على مخاطر عالية وقد تخسر رأس مالك.</p>
          </div>
          {hero && (
            <Link href="/markets" className="block rounded-lg border border-border bg-card transition-colors hover:border-zinc-600">
              <div className="flex items-end justify-between border-b border-border p-4">
                <div>
                  <p className="num text-lg font-bold">{hero.symbol.symbol}</p>
                  <p className="text-xs text-muted-foreground">{hero.symbol.name}</p>
                </div>
                <div className="text-end">
                  <p className={cn("num text-xl font-bold", hero.changePct >= 0 ? "text-success" : "text-destructive")}>
                    {hero.last.toFixed(hero.symbol.digits)}
                  </p>
                  <p className={cn("num text-xs", hero.changePct >= 0 ? "text-success" : "text-destructive")}>
                    {hero.changePct >= 0 ? "+" : ""}
                    {hero.changePct.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="p-2">
                <PriceChart candles={hero.candles.slice(-80)} digits={hero.symbol.digits} lines={heroLines} height={300} />
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* ===== Ticker ===== */}
      <div className="border-b border-border bg-card">
        <div className="container flex gap-8 overflow-x-auto py-3" dir="ltr">
          {markets.series.map((m) => (
            <Link key={m.symbol.symbol} href="/markets" className="num flex shrink-0 items-center gap-2 text-sm">
              <span className="font-semibold">{m.symbol.symbol}</span>
              <span>{m.last.toFixed(m.symbol.digits)}</span>
              <span className={m.changePct >= 0 ? "text-success" : "text-destructive"}>
                {m.changePct >= 0 ? "+" : ""}
                {m.changePct.toFixed(2)}%
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== Stats ===== */}
      <section className="container relative z-10 mt-12">
        <StatsCards stats={stats} />
        {demo && <p className="mt-2 text-center text-xs text-gold">أرقام توضيحية — تظهر الأرقام الحقيقية بعد ربط قاعدة البيانات.</p>}
      </section>

      {/* ===== Partners ===== */}
      <section className="container mt-20">
        <Card className="flex flex-col items-center justify-between gap-6 p-8 md:flex-row">
          <div>
            <p className="text-sm font-semibold text-primary">شريكنا في الوساطة</p>
            <h2 className="mt-1 text-2xl font-bold">{siteConfig.brokerName}</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
              نحن وكيل معرّف (Introducing Broker): نُعرّفك على الوسيط ونرافقك بالدعم والتعليم والتوصيات، بينما يتولى الوسيط المرخّص
              حفظ الأموال وتنفيذ الصفقات. لا نطلب منك أبداً إرسال أموال إلينا.
            </p>
          </div>
          <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={cn(buttonVariants({ variant: "gold", size: "lg" }), "shrink-0")}>
            التسجيل عبر رابط الوكالة
          </a>
        </Card>
      </section>

      {/* ===== Features ===== */}
      <section className="container mt-24">
        <SectionHeading eyebrow="لماذا QFX؟" title="مميزات الانضمام تحت وكالتنا" text="كل ما تحتاجه لتبدأ التداول بشكل منظم، في مكان واحد وبلغتك." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6 transition-colors hover:border-primary/50">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="container mt-24">
        <SectionHeading eyebrow="كيف نعمل" title="أربع خطوات للانضمام" />
        <Steps />
        <div className="mt-8 text-center">
          <Link href="/how-it-works" className={buttonVariants({ variant: "outline" })}>
            <BookOpen className="h-4 w-4" /> التفاصيل والأسئلة الشائعة
          </Link>
        </div>
      </section>

      {/* ===== CTA + Lead form ===== */}
      <section id="join" className="container mt-24 scroll-mt-24">
        <div className="grid overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card lg:grid-cols-2">
          <div className="p-8 md:p-12">
            <h2 className="text-3xl font-bold leading-tight">جاهز للانضمام؟</h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              سجّل حسابك عبر رابط الوكالة، ثم أرسل بياناتك لنفعّل اشتراكك في قناة العملاء. يمكنك أيضاً متابعة قناتنا العامة على
              تيليجرام مجاناً.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "lg" })}>
                1. افتح الحساب
              </a>
              <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={buttonVariants({ size: "lg", variant: "outline" })}>
                القناة العامة على تيليجرام
              </a>
            </div>
          </div>
          <div className="border-t border-border bg-background/40 p-8 md:p-12 lg:border-s lg:border-t-0">
            <h3 className="mb-6 text-xl font-bold">2. أرسل بيانات التفعيل</h3>
            <Suspense>
              <LeadForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
