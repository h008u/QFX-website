"use client";

import { Cookie, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ALLOW_ALL, CATEGORIES, CATEGORY_INFO, DENY_ALL, type Consent } from "@/lib/consent";
import { useConsent } from "./provider";

/** شريط الموافقة: يظهر حتى يجيب الزائر، و«تخصيص» يفتح اختيار كل فئة. الرفض بنفس سهولة القبول */
export function ConsentBanner() {
  const { ready, answered, consent, save, chooserOpen, closeChooser } = useConsent();
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState<Consent>(consent);
  useEffect(() => setDraft(consent), [consent, chooserOpen]);

  const showBanner = ready && !answered && !chooserOpen;
  const showChooser = ready && (chooserOpen || custom);
  if (!showBanner && !showChooser) return null;

  if (showChooser)
    return (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" role="dialog" aria-modal aria-labelledby="consent-title">
        <div className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl md:rounded-2xl">
          <div className="flex items-center justify-between">
            <h2 id="consent-title" className="text-lg font-bold">إعدادات الخصوصية والكوكيز</h2>
            <button
              onClick={() => {
                setCustom(false);
                closeChooser();
              }}
              className="rounded-full p-1.5 hover:bg-secondary"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            <li className="flex items-start justify-between gap-4 rounded-lg bg-secondary/60 p-3">
              <div>
                <p className="font-semibold">الضرورية</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">جلسة الدخول، الأمان، الوضع الفاتح/الداكن، وحفظ اختيارك هذا. لا يمكن تعطيلها.</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">دائماً</span>
            </li>
            {CATEGORIES.map((k) => (
              <li key={k} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <label htmlFor={`c-${k}`} className="cursor-pointer">
                  <p className="font-semibold">{CATEGORY_INFO[k].title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{CATEGORY_INFO[k].text}</p>
                </label>
                <input id={`c-${k}`} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" checked={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.checked })} />
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                save(draft);
                setCustom(false);
              }}
            >
              حفظ اختياري
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                save(ALLOW_ALL);
                setCustom(false);
              }}
            >
              قبول الكل
            </Button>
            <Link href="/cookies" className="ms-auto self-center text-xs text-muted-foreground underline">سياسة الكوكيز</Link>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-[90] border-t border-border bg-card px-4 py-3 text-card-foreground shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:inset-x-3 md:bottom-4 md:mx-auto md:max-w-3xl md:rounded-2xl md:border md:p-4 md:shadow-2xl"
      role="region"
      aria-label="موافقة الكوكيز"
    >
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
        <Cookie className="hidden h-8 w-8 shrink-0 text-primary md:block" />
        {/* نص مختصر على الجوال حتى لا يغطي الشريط محتوى الصفحة */}
        <p className="text-[13px] leading-5 md:hidden">
          نستخدم كوكيز ضرورية، وبموافقتك كوكي الإحالة.{" "}
          <Link href="/cookies" className="font-semibold text-primary underline">
            التفاصيل
          </Link>
        </p>
        <p className="hidden text-sm leading-6 md:block">
          نستخدم كوكيز ضرورية لتشغيل الموقع، وبموافقتك كوكي لنسب الإحالة وأدوات خارجية. يمكنك تغيير اختيارك في أي وقت من{" "}
          <Link href="/cookies" className="font-semibold text-primary underline">
            سياسة الكوكيز
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" className="flex-1 md:flex-none" onClick={() => save(ALLOW_ALL)}>
            قبول الكل
          </Button>
          <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => save(DENY_ALL)}>
            الضرورية فقط
          </Button>
          <Button size="sm" variant="ghost" className="px-2 md:px-3" onClick={() => setCustom(true)}>
            تخصيص
          </Button>
        </div>
      </div>
    </div>
  );
}

/** رابط/زر يفتح إعدادات الكوكيز (في التذييل وصفحة السياسة) */
export function CookieSettingsButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { reopen } = useConsent();
  return (
    <button type="button" onClick={reopen} className={className}>
      {children ?? "إعدادات الكوكيز"}
    </button>
  );
}
