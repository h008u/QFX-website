"use client";

import { BookOpen, CandlestickChart, ChevronLeft, CircleHelp, Compass, LineChart, Menu, Newspaper, Send, Signal, Star, UserRound, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LAST_SYMBOL_KEY } from "@/components/market/remember-symbol";
import { ThemeToggle } from "@/components/theme-toggle";
import { marketHref } from "@/config/markets";
import { siteConfig } from "@/config/site";
import { useUser } from "@/lib/use-user";
import { cn } from "@/lib/utils";

/** شريط تبويبات سفلي بأسلوب تطبيقات التداول على الجوال */
function Tabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view");
  const [menu, setMenu] = useState(false);
  const user = useUser();
  useEffect(() => setMenu(false), [pathname, view]);
  // تبويب «الشارت» يفتح آخر رمز شاهده الزائر
  const [lastSymbol, setLastSymbol] = useState("XAUUSD");
  useEffect(() => {
    try {
      setLastSymbol(localStorage.getItem(LAST_SYMBOL_KEY) || "XAUUSD");
    } catch {
      /* التخزين غير متاح */
    }
  }, [pathname]);
  if (pathname.startsWith("/admin")) return null;

  const items = [
    { href: "/markets", label: "الأسواق", icon: Star, active: pathname === "/markets" || (pathname.startsWith("/markets/") && view !== "chart") },
    { href: marketHref(lastSymbol, "chart"), label: "الشارت", icon: CandlestickChart, active: pathname.startsWith("/markets/") && view === "chart" },
    { href: "/", label: "استكشف", icon: Compass, active: pathname === "/" },
    { href: "/signals", label: "التوصيات", icon: Signal, active: pathname.startsWith("/signals") || pathname.startsWith("/performance") },
  ];
  const links: [string, string, LucideIcon][] = [
    ["/feed", "الأخبار والتحليلات", Newspaper],
    ["/markets", "الأسواق", Star],
    ["/performance", "سجل الأداء", LineChart],
    ["/blog", "المقالات", BookOpen],
    ["/how-it-works", "كيف نعمل", CircleHelp],
    [user ? "/account" : "/login", user ? "حسابي" : "تسجيل الدخول", UserRound],
    [siteConfig.telegramUrl, "قناة تيليجرام", Send],
  ];

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal aria-label="القائمة">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto rounded-t-2xl bg-background p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-bold">القائمة</p>
              <button onClick={() => setMenu(false)} aria-label="إغلاق" className="rounded-full p-2 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Link href="/#join" className="mb-2 flex items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-[16px] font-bold text-primary-foreground">
              افتح حسابك عبر الوكالة
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <ul className="grid grid-cols-2 gap-1">
              {links.map(([href, label, Icon]) => (
                <li key={label}>
                  <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-3 text-[15px] font-semibold hover:bg-secondary">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="theme-toggle mt-2 flex items-center justify-between border-t border-border px-2 pt-3 text-sm">
              الوضع الداكن
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
      <nav className="app-tabbar pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background md:hidden" aria-label="التنقل السفلي">
        <ul className="grid h-14 grid-cols-5">
          {items.map(({ href, label, icon: Icon, active }) => (
            <li key={href}>
              <Link href={href} className={cn("flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.7} fill={active && Icon === Star ? "currentColor" : "none"} />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => setMenu((v) => !v)} className={cn("flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium", menu ? "text-primary" : "text-muted-foreground")}>
              <Menu className="h-[22px] w-[22px]" strokeWidth={1.7} />
              القائمة
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function BottomNav() {
  return (
    <Suspense>
      <Tabs />
    </Suspense>
  );
}
