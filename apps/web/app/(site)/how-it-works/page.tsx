import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/landing/faq-list";
import { Steps } from "@/components/landing/steps";
import { PageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "كيف نعمل",
  description: "خطوات التسجيل عبر رابط الإحالة والحصول على التوصيات والدعم من وكالة QFX.",
};

export default function HowItWorksPage() {
  return (
    <div className="container py-8 md:py-12">
      <PageTitle title="من التسجيل إلى أول توصية" text="عملية بسيطة وشفافة: حسابك وأموالك لدى وسيط مرخّص، ونحن نرافقك بالدعم والمحتوى." />
      <div className="mt-10">
        <Steps />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="h-fit rounded-2xl bg-secondary p-6 lg:col-span-1">
          <h3 className="text-lg font-bold">كيف ترتبط الخدمات ببعضها؟</h3>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
            <li>📌 <b className="text-foreground">الموقع:</b> سجل التوصيات، التحليلات، الأخبار ونموذج الانضمام.</li>
            <li>🤖 <b className="text-foreground">بوت تيليجرام:</b> ينشر التوصيات وتحديثاتها وملخص المفكرة الاقتصادية تلقائياً.</li>
            <li>💬 <b className="text-foreground">المجتمع:</b> متابعة التحليلات حسب الأصل (عملات، ذهب، نفط) بشكل منظم.</li>
          </ul>
        </div>
        <div className="lg:col-span-2">
          <h2 id="faq" className="mb-2 scroll-mt-24 text-2xl font-bold">الأسئلة الشائعة</h2>
          <FaqList />
        </div>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-3">
        <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "pill" })}>
          ابدأ الآن عبر رابط الوكالة
        </a>
        <Link href="/#join" className={buttonVariants({ size: "pill", variant: "outline" })}>
          أرسل بيانات التفعيل
        </Link>
      </div>
    </div>
  );
}
