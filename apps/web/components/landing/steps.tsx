import { BadgeCheck, Link2, Send, Wallet } from "lucide-react";

export const steps = [
  {
    icon: Link2,
    title: "سجّل عبر رابط الإحالة",
    text: "افتح حساب تداول حقيقي لدى الوسيط المرخّص الشريك من خلال رابطنا، ليُربط حسابك بوكالتنا تلقائياً.",
  },
  {
    icon: Wallet,
    title: "وثّق حسابك وموّله",
    text: "أكمل التحقق من الهوية لدى الوسيط مباشرة، ثم أودع بالطريقة التي تناسبك. أموالك تبقى دائماً لدى الوسيط.",
  },
  {
    icon: BadgeCheck,
    title: "أرسل بياناتك للتفعيل",
    text: "املأ نموذج الانضمام برقم حسابك ليتحقق فريقنا من ارتباطه بالوكالة خلال 24 ساعة.",
  },
  {
    icon: Send,
    title: "استقبل التوصيات والدعم",
    text: "نضيفك لقناة العملاء على تيليجرام لتصلك التوصيات والتحليلات وتنبيهات الأخبار المهمة فور صدورها.",
  },
];

export function Steps() {
  return (
    <ol className="relative grid gap-6 md:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.title} className="relative rounded-lg border border-border bg-card p-5">
          <span className="absolute -top-3 start-5 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
            الخطوة {i + 1}
          </span>
          <step.icon className="mt-2 h-8 w-8 text-primary" />
          <h3 className="mt-4 font-bold">{step.title}</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
