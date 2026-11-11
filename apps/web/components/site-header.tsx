"use client";

import { Menu, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">QFX</span>
      <span className="hidden sm:inline">
        Q<span className="text-primary">FX</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === item.href && "bg-secondary text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <a href={siteConfig.telegramUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Send className="h-4 w-4" /> تيليجرام
          </a>
          <Link href="/#join" className={buttonVariants({ size: "sm" })}>
            افتح حسابك
          </Link>
        </div>
        <button className="md:hidden" aria-label="القائمة" onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="container flex flex-col gap-1 pb-4 md:hidden">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-secondary">
              {item.label}
            </Link>
          ))}
          <Link href="/#join" onClick={() => setOpen(false)} className={cn(buttonVariants(), "mt-2")}>
            افتح حسابك
          </Link>
        </nav>
      )}
    </header>
  );
}
