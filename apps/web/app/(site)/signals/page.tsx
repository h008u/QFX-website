import type { Metadata } from "next";
import { PageTitle } from "@/components/page-title";
import { SignalsBoard } from "@/components/signals/signals-board";
import { StatsCards } from "@/components/signals/stats-cards";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getSignalStats, getSignals } from "@/lib/data";

export const metadata: Metadata = {
  title: "التوصيات ونسخ التداول",
  description: "التوصيات الحية والسجل التاريخي الكامل مع نسبة النجاح ومجموع النقاط.",
};

export const revalidate = 30;

export default async function SignalsPage() {
  const [{ data: stats }, { data: signals, demo }] = await Promise.all([getSignalStats(), getSignals(100)]);

  return (
    <div className="container space-y-10 py-8 md:py-12">
      <PageTitle
        title="التوصيات ونسخ التداول"
        text="كل توصية تُنشر هنا وفي قناة التيليجرام في نفس اللحظة، ويُحدَّث سجلها تلقائياً عند تحقق الهدف أو ضرب الوقف."
      />
      <StatsCards stats={stats} />
      <SignalsBoard initial={signals} demo={demo} />

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-secondary p-6 md:flex-row md:items-center md:p-8">
        <div>
          <h3 className="text-xl font-bold">تفضّل نسخ الصفقات تلقائياً؟</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            يمكن لعملاء الوكالة ربط حساباتهم بخدمة نسخ التداول عبر منصة الوسيط. الأداء السابق لا يضمن النتائج المستقبلية.
          </p>
        </div>
        <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
          افتح حساباً للنسخ
        </a>
      </div>
    </div>
  );
}
