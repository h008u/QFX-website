"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * إحصاءات زيارات بلا كوكيز (Plausible أو Umami) — لا تحفظ أي معرّف على جهاز الزائر ولا بيانات شخصية،
 * لذلك لا تحتاج شريط الموافقة. تُفعّل بمتغيرات البيئة فقط:
 *   NEXT_PUBLIC_ANALYTICS=plausible + NEXT_PUBLIC_PLAUSIBLE_DOMAIN (و NEXT_PUBLIC_PLAUSIBLE_SRC للاستضافة الذاتية)
 *   NEXT_PUBLIC_ANALYTICS=umami + NEXT_PUBLIC_UMAMI_WEBSITE_ID + NEXT_PUBLIC_UMAMI_SRC
 * وتسجّل حدث «referral_click» عند النقر على أي رابط إحالة للوسيط (rel=sponsored) لقياس التحويل.
 */
const provider = process.env.NEXT_PUBLIC_ANALYTICS;

type W = Window & { plausible?: (e: string, o?: { props?: Record<string, string> }) => void; umami?: { track: (e: string, d?: Record<string, string>) => void } };

export function trackEvent(name: string, props?: Record<string, string>) {
  const w = window as W;
  try {
    if (w.plausible) w.plausible(name, props ? { props } : undefined);
    else if (w.umami) w.umami.track(name, props);
  } catch {
    /* لا يجب أن تعطّل الإحصاءات أي نقرة */
  }
}

export function Analytics() {
  useEffect(() => {
    if (!provider) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const rel = a.getAttribute("rel") ?? "";
      if (rel.includes("sponsored")) trackEvent("referral_click", { page: location.pathname });
      else if (a.href.includes("t.me/")) trackEvent("telegram_click", { page: location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (provider === "plausible" && process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)
    return <Script defer data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js"} strategy="afterInteractive" />;
  if (provider === "umami" && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && process.env.NEXT_PUBLIC_UMAMI_SRC)
    return <Script defer data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID} data-do-not-track="true" src={process.env.NEXT_PUBLIC_UMAMI_SRC} strategy="afterInteractive" />;
  return null;
}
