"use client";

import { Cookie, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ALLOW_ALL, CATEGORIES, CATEGORY_INFO, DENY_ALL, type Consent } from "@/lib/consent";
import { cn } from "@/lib/utils";
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
    <div className="fixed inset-x-3 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl md:bottom-4" role="region" aria-label="موافقة الكوكيز">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Cookie className="hidden h-8 w-8 shrink-0 text-primary md:block" />
        <p className="text-sm leading-6">
          نستخدم كوكيز ضرورية لتشغيل الموقع، وبموافقتك كوكي لنسب الإحالة وأدوات خارجية. يمكنك تغيير اختيارك في أي وقت من{" "}
          <Link href="/cookies" className="font-semibold text-primary underline">
            سياسة الكوكيز
          </Link>
          .
        </p>
        <div className={cn("flex shrink-0 flex-wrap gap-2")}>
          <Button size="sm" onClick={() => save(ALLOW_ALL)}>
            قبول الكل
          </Button>
          <Button size="sm" variant="outline" onClick={() => save(DENY_ALL)}>
            الضرورية فقط
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCustom(true)}>
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
