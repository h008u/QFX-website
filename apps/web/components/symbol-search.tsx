"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_LABEL, MARKETS, type MarketCategory } from "@/config/markets";
import { cn } from "@/lib/utils";
import { SymbolLogo } from "./market/symbol-logo";

const TABS: ("all" | MarketCategory)[] = ["all", "forex", "metals", "energy", "crypto"];

export const SEARCH_EVENT = "qfx-open-search";
export const openSymbolSearch = () => window.dispatchEvent(new Event(SEARCH_EVENT));

/** نافذة البحث عن رمز (Ctrl+K) بأسلوب منصات التحليل */
export function SymbolSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(SEARCH_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(SEARCH_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return MARKETS.filter((m) => (tab === "all" || m.category === tab) && (!t || `${m.symbol} ${m.name} ${m.short}`.toLowerCase().includes(t)));
  }, [q, tab]);
  useEffect(() => setI(0), [q, tab]);

  if (!open) return null;
  const go = (s: string) => {
    setOpen(false);
    router.push(`/markets?s=${s}`);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center sm:p-4 sm:pt-[8vh]" role="dialog" aria-modal aria-label="بحث عن رمز">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[78vh] sm:max-w-[720px] sm:rounded-xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="text-xl font-bold">بحث عن رمز</h2>
          <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-secondary" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-5 flex items-center gap-2 border-b-2 border-primary pb-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setI((x) => Math.min(x + 1, list.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setI((x) => Math.max(x - 1, 0)));
              if (e.key === "Enter" && list[i]) go(list[i].symbol);
            }}
            placeholder="الرمز أو الاسم — مثلاً XAUUSD أو الذهب"
            className="h-10 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-5 py-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("h-8 shrink-0 rounded-pill px-4 text-sm font-medium transition-colors", tab === t ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-input/60")}>
              {t === "all" ? "الكل" : CATEGORY_LABEL[t]}
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto border-t border-border">
          {list.map((m, k) => (
            <li key={m.symbol}>
              <button
                onMouseEnter={() => setI(k)}
                onClick={() => go(m.symbol)}
                className={cn("flex w-full items-center gap-3 border-b border-border/60 px-5 py-2.5 text-start", k === i && "bg-secondary")}
              >
                <SymbolLogo symbol={m.symbol} size={28} />
                <span className="num w-24 shrink-0 font-bold">{m.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{m.name}<span className="ms-2 hidden text-muted-foreground sm:inline" dir="ltr">{m.short}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{CATEGORY_LABEL[m.category]}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="p-10 text-center text-sm text-muted-foreground">لا توجد نتائج</li>}
        </ul>
        <p className="hidden border-t border-border px-5 py-2 text-xs text-muted-foreground sm:block">↑↓ للتنقل • Enter للفتح • Esc للإغلاق</p>
      </div>
    </div>
  );
}
