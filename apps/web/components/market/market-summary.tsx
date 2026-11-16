"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABEL, type MarketCategory } from "@/config/markets";
import { cn } from "@/lib/utils";
import { AdvancedChart, type ChartCandle } from "./advanced-chart";
import { Sparkline } from "./sparkline";
import { SymbolLogo } from "./symbol-logo";
import { LiveChange, LivePrice } from "./live-quotes";

export interface SummaryItem {
  symbol: string;
  name: string;
  category: MarketCategory;
  digits: number;
  last: number;
  change: number;
  changePct: number;
  candles: ChartCandle[];
  spark: number[];
}

/** ملخص السوق: تبويبات الفئات + شارت كبير + قائمة الرموز (مثل الصفحات الرئيسية لمنصات التحليل) */
export function MarketSummary({ items, title }: { items: SummaryItem[]; title?: React.ReactNode }) {
  const cats = [...new Set(items.map((i) => i.category))];
  const [cat, setCat] = useState<MarketCategory>(cats[0]);
  const list = useMemo(() => items.filter((i) => i.category === cat), [items, cat]);
  const [sel, setSel] = useState<string | undefined>(list[0]?.symbol);
  const current = list.find((i) => i.symbol === sel) ?? list[0];

  return (
    <section>
      <Link href="/markets" className="group mb-5 inline-flex items-center gap-1 text-[28px] font-bold leading-tight md:text-[34px]">
        {title ?? "ملخص السوق"}
        <ChevronLeft className="h-7 w-7 transition-transform group-hover:-translate-x-1" />
      </Link>
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCat(c);
              setSel(items.find((i) => i.category === c)?.symbol);
            }}
            className={cn("h-10 shrink-0 rounded-pill px-5 text-[15px] font-semibold transition-colors", c === cat ? "bg-foreground text-background" : "bg-secondary hover:bg-input/60")}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {/* بطاقات الرموز */}
      <div className="scrollbar-none -mx-4 mb-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {list.slice(0, 4).map((i) => (
          <button
            key={i.symbol}
            onClick={() => setSel(i.symbol)}
            className={cn(
              "min-w-[220px] rounded-xl border p-4 text-start transition-colors",
              i.symbol === current?.symbol ? "border-foreground" : "border-border hover:bg-secondary/60",
            )}
          >
            <div className="flex items-center gap-2.5">
              <SymbolLogo symbol={i.symbol} size={28} />
              <span className="num font-bold">{i.symbol}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="num text-lg font-bold"><LivePrice symbol={i.symbol} value={i.last} digits={i.digits} /></p>
                <LiveChange symbol={i.symbol} pct={i.changePct} className="text-sm" />
              </div>
              <Sparkline values={i.spark} up={i.changePct >= 0} width={84} height={34} />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border lg:grid-cols-[minmax(0,1fr)_340px]">
        {current && (
          <div className="min-w-0 border-border lg:border-e">
            <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
              <SymbolLogo symbol={current.symbol} size={40} />
              <div>
                <p className="text-lg font-bold">{current.name}</p>
                <p className="num text-sm text-muted-foreground">{current.symbol}</p>
              </div>
              <div className="ms-auto text-end">
                <p className="num text-[28px] font-bold leading-none"><LivePrice symbol={current.symbol} value={current.last} digits={current.digits} /></p>
                <LiveChange symbol={current.symbol} pct={current.changePct} abs={current.change} digits={current.digits} className="text-sm" />
              </div>
            </div>
            <AdvancedChart key={current.symbol} symbol={current.symbol} candles={current.candles} digits={current.digits} className="mt-3 h-[320px] md:h-[420px]" compactToolbar />
          </div>
        )}
        <ul className="hidden divide-y divide-border lg:block">
          {list.map((i) => (
            <li key={i.symbol}>
              <button onClick={() => setSel(i.symbol)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-secondary/60", i.symbol === current?.symbol && "bg-secondary")}>
                <SymbolLogo symbol={i.symbol} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="num block font-semibold">{i.symbol}</span>
                  <span className="block truncate text-xs text-muted-foreground">{i.name}</span>
                </span>
                <span className="text-end">
                  <LivePrice symbol={i.symbol} value={i.last} digits={i.digits} className="num block text-[15px] font-semibold" />
                  <LiveChange symbol={i.symbol} pct={i.changePct} className="text-xs" />
                </span>
              </button>
            </li>
          ))}
          <li>
            <Link href="/markets" className="block px-4 py-3 text-sm font-semibold text-primary hover:bg-secondary/60">
              كل الأسواق ←
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
