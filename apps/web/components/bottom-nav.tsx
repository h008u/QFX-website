"use client";

import { CandlestickChart, Compass, Lightbulb, Menu, Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  if (pathname.startsWith("/admin")) return null;

  const items = [
    { href: "/markets?view=watchlist", label: "المراقبة", icon: Star, active: pathname === "/markets" && view !== "chart" },
    { href: "/markets?view=chart", label: "الشارت", icon: CandlestickChart, active: pathname === "/markets" && view === "chart" },
    { href: "/", label: "استكشف", icon: Compass, active: pathname === "/" },
    { href: "/feed", label: "الأفكار", icon: Lightbulb, active: pathname.startsWith("/feed") || pathname.startsWith("/signals") },
  ];

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] rounded-t-2xl bg-background p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg font-bold">القائمة</p>
              <button onClick={() => setMenu(false)} aria-label="إغلاق" className="rounded-full p-2 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            {[
              ["/signals", "التوصيات وسجل الأداء"],
              ["/how-it-works", "كيف نعمل"],
              ["/#join", "افتح حسابك"],
              [user ? "/account" : "/login", user ? "حسابي" : "تسجيل الدخول"],
              [siteConfig.telegramUrl, "قناة تيليجرام"],
            ].map(([href, label]) => (
              <Link key={label} href={href} className="block rounded-lg px-2 py-3 text-[16px] font-semibold hover:bg-secondary">
                {label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border px-2 pt-3 text-sm">
              الوضع الداكن
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background md:hidden" aria-label="التنقل السفلي">
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
