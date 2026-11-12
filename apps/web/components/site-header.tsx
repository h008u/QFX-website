"use client";

import { Menu, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { useUser } from "@/lib/use-user";
import { cn } from "@/lib/utils";
import { openSymbolSearch, SymbolSearch } from "./symbol-search";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2", className)} aria-label="QFX الرئيسية">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <rect width="34" height="34" rx="9" className="fill-foreground" />
        <path d="M8 22.5 L14 15.5 L18.5 19.5 L26 10.5" fill="none" stroke="#2962FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="10.5" r="2.4" fill="#2962FF" />
      </svg>
      <span className="text-[22px] font-black tracking-tight" dir="ltr">QFX</span>
    </Link>
  );
}

const NAV = [
  { href: "/markets", label: "الأسواق" },
  { href: "/signals", label: "التوصيات" },
  { href: "/feed", label: "الأفكار والأخبار" },
  { href: "/how-it-works", label: "كيف نعمل" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useUser();
  const account = user ? { href: "/account", label: "حسابي" } : { href: "/login", label: "دخول" };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container flex h-16 items-center gap-4">
          <Logo />
          {/* شريط البحث الكبير */}
          <button
            onClick={openSymbolSearch}
            className="hidden h-11 min-w-0 max-w-[340px] flex-1 items-center gap-2.5 rounded-full bg-secondary px-4 text-[15px] text-muted-foreground transition-colors hover:bg-input/60 md:flex"
          >
            <Search className="h-[18px] w-[18px]" />
            بحث
            <kbd className="num ms-auto rounded border border-input bg-background px-1.5 text-[11px]">Ctrl K</kbd>
          </button>
          <nav className="hidden items-center lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[15px] font-semibold transition-colors hover:bg-secondary",
                  pathname.startsWith(n.href) ? "text-primary" : "text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <button onClick={openSymbolSearch} className="rounded-full p-2.5 hover:bg-secondary md:hidden" aria-label="بحث">
              <Search className="h-5 w-5" />
            </button>
            <ThemeToggle className="hidden sm:grid" />
            {user !== undefined && (
              <Link href={account.href} className="hidden h-10 w-10 place-items-center rounded-full hover:bg-secondary sm:grid" aria-label={account.label} title={account.label}>
                <UserRound className="h-5 w-5" />
              </Link>
            )}
            <Link href="/#join" className={cn(buttonVariants({ size: "pill" }), "hidden h-10 sm:inline-flex")}>
              ابدأ الآن
            </Link>
            <button className="rounded-full p-2.5 hover:bg-secondary lg:hidden" aria-label="القائمة" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="container border-t border-border py-3 lg:hidden">
            {[...NAV, account].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-[17px] font-semibold hover:bg-secondary">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between px-3">
              <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className="text-sm font-semibold text-primary">قناة تيليجرام</a>
              <ThemeToggle />
            </div>
          </nav>
        )}
      </header>
      <SymbolSearch />
    </>
  );
}
