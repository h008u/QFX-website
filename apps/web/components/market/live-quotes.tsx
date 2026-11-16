"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Change, fmtPrice } from "./price";

export interface LiveQuote {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
}

const Ctx = createContext<Record<string, LiveQuote>>({});
const POLL_MS = 30_000;

/** يجلب آخر الأسعار من /api/quotes كل 30 ثانية ما دامت الصفحة ظاهرة */
export function LiveQuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) return;
        const { quotes: list } = (await res.json()) as { quotes: LiveQuote[] };
        if (!stop && Array.isArray(list)) setQuotes(Object.fromEntries(list.map((q) => [q.symbol, q])));
      } catch {
        /* شبكة ضعيفة — نبقي آخر قيمة */
      }
    };
    const loop = async () => {
      await load();
      if (!stop) timer = setTimeout(loop, POLL_MS);
    };
    timer = setTimeout(loop, POLL_MS); // أول تحديث بعد 30 ثانية: الصفحة تصل بأسعار حديثة من الخادم
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <Ctx.Provider value={quotes}>{children}</Ctx.Provider>;
}

export const useLiveQuote = (symbol: string): LiveQuote | undefined => useContext(Ctx)[symbol];

/** يومض بالأخضر/الأحمر عند تغيّر القيمة */
function useFlash(value: number) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value === prev.current) return;
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [value]);
  return flash;
}

/** سعر حي: يبدأ بقيمة الخادم ثم يتحدث تلقائياً */
export function LivePrice({ symbol, value, digits, className }: { symbol: string; value: number; digits: number; className?: string }) {
  const q = useLiveQuote(symbol);
  const v = q?.last ?? value;
  const flash = useFlash(v);
  return (
    <span className={cn("transition-colors duration-700", flash === "up" && "text-up", flash === "down" && "text-down", className)}>
      {fmtPrice(v, digits)}
    </span>
  );
}

/** نسبة تغيّر حية (24 ساعة) */
export function LiveChange({ symbol, pct, abs, digits, chip, className }: { symbol: string; pct: number; abs?: number; digits?: number; chip?: boolean; className?: string }) {
  const q = useLiveQuote(symbol);
  return <Change pct={q?.changePct ?? pct} abs={abs === undefined ? undefined : (q?.change ?? abs)} digits={digits} chip={chip} className={className} />;
}

/** نسبة التغيّر بأسهم ▲▼ لشريط الأسعار */
export function TickerChange({ symbol, pct }: { symbol: string; pct: number }) {
  const v = useLiveQuote(symbol)?.changePct ?? pct;
  return (
    <span className={cn("font-semibold", v >= 0 ? "text-up" : "text-down")}>
      {v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
}
