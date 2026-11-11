import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { SignalsBoard } from "@/components/signals/signals-board";
import { StatsCards } from "@/components/signals/stats-cards";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="container space-y-10 py-16">
      <SectionHeading
        eyebrow="سجل أداء شفاف"
        title="التوصيات ونسخ التداول"
        text="كل توصية تُنشر هنا وفي قناة التيليجرام في نفس اللحظة، ويُحدَّث سجلها تلقائياً عند تحقق الهدف أو ضرب الوقف."
      />
      <StatsCards stats={stats} />
      <SignalsBoard initial={signals} demo={demo} />

      <Card className="flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
        <div>
          <h3 className="font-bold">تفضّل نسخ الصفقات تلقائياً؟</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            يمكن لعملاء الوكالة ربط حساباتهم بخدمة نسخ التداول عبر منصة الوسيط. الأداء السابق لا يضمن النتائج المستقبلية.
          </p>
        </div>
        <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ variant: "gold" })}>
          افتح حساباً للنسخ
        </a>
      </Card>
    </div>
  );
}
