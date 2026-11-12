"use client";

import { Bell, ExternalLink, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_KEY } from "@/lib/theme-script";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { PushToggle } from "./push-toggle";
import { Toaster } from "./toaster";
import { ADMIN_NAV } from "./nav";

export interface ShellCounts {
  pending: number;
  failed: number;
  leads: number;
  tasksFailing: number;
}

export interface ShellNotification {
  href: string;
  text: string;
  tone: "info" | "warn" | "bad";
}

export function AdminShell({
  children,
  user,
  roleLabel,
  isAdmin,
  demo,
  counts,
  notifications,
  paused,
}: {
  children: React.ReactNode;
  user: string;
  roleLabel: string;
  isAdmin: boolean;
  demo: boolean;
  counts: ShellCounts;
  notifications: ShellNotification[];
  paused: boolean;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const items = ADMIN_NAV.filter((n) => !n.adminOnly || isAdmin);

  useEffect(() => {
    setNavOpen(false);
    setBellOpen(false);
  }, [pathname]);

  // اللوحة تبقى على الثيم المؤسسي (فاتح/داكن حسب اختيار المستخدم) مهما كان ثيم الموقع
  useEffect(() => {
    const d = document.documentElement;
    const prevTheme = d.getAttribute("data-theme");
    const prevDark = d.classList.contains("dark");
    let wantDark = false;
    try {
      wantDark = localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      /* التخزين غير متاح */
    }
    d.setAttribute("data-theme", "institutional");
    d.classList.toggle("dark", wantDark);
    return () => {
      if (prevTheme) d.setAttribute("data-theme", prevTheme);
      d.classList.toggle("dark", prevDark);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const groups = [...new Set(items.map((i) => i.group))];
  const badgeOf = (b?: string) => (b === "pending" ? counts.pending : b === "failed" ? counts.failed : b === "leads" ? counts.leads : 0);

  const sidebar = (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto p-3" aria-label="قائمة اللوحة">
      <Link href="/admin" className="flex items-center gap-2 px-2 py-1 text-lg font-black">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs text-primary-foreground">QFX</span>
        لوحة الإدارة
      </Link>
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        بحث سريع
        <kbd className="num ms-auto rounded border border-border px-1.5 text-[10px]">Ctrl K</kbd>
      </button>
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1 px-2 text-[11px] font-semibold text-muted-foreground">{g}</p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const n = badgeOf(i.badge);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={isActive(i.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                        isActive(i.href) ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <i.icon className={cn("h-4 w-4", isActive(i.href) && "text-primary")} />
                      {i.label}
                      {n > 0 && (
                        <span
                          className={cn(
                            "num ms-auto rounded-full px-1.5 text-[10px] font-bold",
                            i.badge === "failed" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary",
                          )}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      <div className="mt-auto space-y-2 border-t border-border pt-3 text-xs">
        <Link href="/" className="flex items-center gap-2 px-2 text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" /> عرض الموقع
        </Link>
        <p className="px-2 text-muted-foreground">
          {user} • <span className="text-foreground">{roleLabel}</span>
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-e border-border bg-card lg:block">{sidebar}</aside>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 border-e border-border bg-card">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="glass sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border px-4">
          <button className="lg:hidden" aria-label="القائمة" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          {paused && (
            <Link href="/admin/settings#general" className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
              ⏸ النشر التلقائي متوقف
            </Link>
          )}
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setPaletteOpen(true)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="بحث">
              <Search className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="الإشعارات"
                aria-expanded={bellOpen}
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="num absolute -top-0.5 end-0 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute end-0 top-11 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm font-semibold">
                    الإشعارات
                    <button onClick={() => setBellOpen(false)} aria-label="إغلاق">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.map((n, i) => (
                      <li key={i}>
                        <Link href={n.href} className="flex gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-0 hover:bg-secondary">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.tone === "bad" ? "bg-destructive" : n.tone === "warn" ? "bg-gold" : "bg-primary")} />
                          {n.text}
                        </Link>
                      </li>
                    ))}
                    {!notifications.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">لا شيء جديد 👌</li>}
                  </ul>
                  <PushToggle />
                </div>
              )}
            </div>
          </div>
        </header>
        {demo && (
          <div className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-xs text-gold">
            وضع المعاينة: بيانات توضيحية والتعديلات لا تُحفظ دائماً — اربط Supabase وخدمة البوت لتفعيل اللوحة الحقيقية.
          </div>
        )}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      <Toaster />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} isAdmin={isAdmin} />
    </div>
  );
}
