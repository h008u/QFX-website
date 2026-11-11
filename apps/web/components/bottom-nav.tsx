"use client";

import { Bell, CandlestickChart, Home, Newspaper, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/markets", label: "الشارت", icon: CandlestickChart },
  { href: "/signals", label: "التنبيهات", icon: Bell },
  { href: "/feed", label: "التحليلات", icon: Newspaper },
  { href: "/account", label: "حسابي", icon: UserRound },
];

/** شريط تنقل سفلي زجاجي للجوال — بأسلوب تطبيقات التداول */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-border md:hidden" aria-label="التنقل السفلي">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : href === "/account" ? /^\/(account|login)/.test(pathname) : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
