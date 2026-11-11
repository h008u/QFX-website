import type { Metadata } from "next";
import Link from "next/link";
import { Steps } from "@/components/landing/steps";
import { SectionHeading } from "@/components/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "كيف نعمل",
  description: "خطوات التسجيل عبر رابط الإحالة والحصول على التوصيات والدعم من وكالة QFX.",
};

const faqs = [
  {
    q: "ما هو الوكيل المعرّف (IB)؟",
    a: "الوكيل المعرّف هو جهة تُعرّف العملاء على شركة وساطة مرخّصة وتقدّم لهم خدمات إضافية مثل الدعم والتعليم والتحليلات. يحصل الوكيل على عمولة من الوسيط مقابل ذلك، دون أي تكلفة إضافية عليك.",
  },
  {
    q: "هل أرسل أموالي إليكم؟",
    a: "لا أبداً. الإيداع والسحب يتمّان مباشرة بينك وبين شركة الوساطة. لا نطلب كلمات المرور ولا نستلم أي أموال.",
  },
  {
    q: "لدي حساب مسبق لدى الوسيط، هل أستطيع الانضمام؟",
    a: "بعض الوسطاء يسمحون بنقل الحساب إلى وكالة جديدة عبر طلب للدعم. تواصل معنا وسنساعدك، أو افتح حساباً جديداً عبر رابطنا.",
  },
  {
    q: "هل التوصيات مضمونة الربح؟",
    a: "لا. لا توجد توصيات مضمونة في الأسواق المالية. ننشر سجلاً كاملاً بالنتائج الرابحة والخاسرة لتقييم الأداء بنفسك، وننصح دائماً بإدارة رأس المال وعدم المخاطرة بأكثر من 1-2% في الصفقة.",
  },
  {
    q: "كيف تصلني التوصيات؟",
    a: "تُنشر التوصية في قناة تيليجرام وعلى صفحة التوصيات في الموقع في نفس اللحظة، مع تحديث تلقائي عند تحقق الهدف أو ضرب الوقف.",
  },
  {
    q: "ما هو نسخ التداول؟",
    a: "بعض الوسطاء يتيحون ربط حسابك بحساب استراتيجية لنسخ الصفقات تلقائياً. يتم ذلك عبر منصة الوسيط نفسها ويمكنك إيقافه في أي وقت.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container py-16">
      <SectionHeading
        eyebrow="كيف نقدّم الخدمة"
        title="من التسجيل إلى أول توصية"
        text="عملية بسيطة وشفافة: حسابك وأموالك لدى وسيط مرخّص، ونحن نرافقك بالدعم والمحتوى."
      />
      <Steps />

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-bold">كيف ترتبط الخدمات ببعضها؟</h3>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
            <li>📌 <b className="text-foreground">الموقع:</b> سجل التوصيات، التحليلات، الأخبار ونموذج الانضمام.</li>
            <li>🤖 <b className="text-foreground">بوت تيليجرام:</b> ينشر التوصيات وتحديثاتها وملخص المفكرة الاقتصادية تلقائياً.</li>
            <li>💬 <b className="text-foreground">المجتمع:</b> متابعة التحليلات حسب الأصل (عملات، ذهب، نفط) بشكل منظم.</li>
          </ul>
        </Card>
        <div className="space-y-3 lg:col-span-2">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-lg border border-border bg-card p-5 open:border-primary/40">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="me-2 inline-block text-primary transition-transform group-open:rotate-45">+</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-3">
        <a href={siteConfig.referralUrl} target="_blank" rel="noopener sponsored" className={buttonVariants({ size: "lg" })}>
          ابدأ الآن عبر رابط الوكالة
        </a>
        <Link href="/#join" className={buttonVariants({ size: "lg", variant: "outline" })}>
          أرسل بيانات التفعيل
        </Link>
      </div>
    </div>
  );
}
