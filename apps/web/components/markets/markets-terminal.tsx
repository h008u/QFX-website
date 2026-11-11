"use client";

import { DIRECTION_LABEL, type Signal } from "@qfx/shared";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PriceChart, type ChartCandle, type ChartPriceLine } from "./price-chart";

export interface TerminalSeries {
  symbol: string;
  name: string;
  digits: number;
  candles: ChartCandle[];
  last: number;
  changePct: number;
}

function Change({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("num text-xs font-medium", up ? "text-success" : "text-destructive")}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

/** واجهة الأسواق: قائمة مراقبة + شارت + توصيات الأداة المفتوحة */
export function MarketsTerminal({ series, signals, demo }: { series: TerminalSeries[]; signals: Signal[]; demo: boolean }) {
  const [active, setActive] = useState(series[0]?.symbol);
  const current = series.find((s) => s.symbol === active) ?? series[0];

  const related = useMemo(() => signals.filter((s) => s.symbol === current?.symbol), [signals, current]);
  const lines = useMemo<ChartPriceLine[]>(
    () =>
      related.flatMap((s) => [
        { price: Number(s.entry_price), title: `${DIRECTION_LABEL[s.direction]} Entry`, kind: "entry" as const },
        { price: Number(s.stop_loss), title: "SL", kind: "sl" as const },
        { price: Number(s.take_profit_1), title: "TP1", kind: "tp" as const },
        ...(s.take_profit_2 ? [{ price: Number(s.take_profit_2), title: "TP2", kind: "tp" as const }] : []),
      ]),
    [related],
  );

  if (!current) return null;
  const up = current.changePct >= 0;
  const lastCandle = current.candles.at(-1);

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* الشارت */}
      <section className="min-w-0 bg-card">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
          <div>
            <p className="num text-xl font-bold">{current.symbol}</p>
            <p className="text-xs text-muted-foreground">{current.name} • إطار الساعة</p>
          </div>
          <div className="text-end">
            <p className={cn("num text-2xl font-bold", up ? "text-success" : "text-destructive")}>
              {current.last.toFixed(current.digits)}
            </p>
            <Change value={current.changePct} />
          </div>
        </header>
        {lastCandle && (
          <div dir="ltr" className="num flex gap-4 px-4 pt-3 text-[11px] text-muted-foreground">
            {(["open", "high", "low", "close"] as const).map((k) => (
              <span key={k}>
                {k[0].toUpperCase()} <span className="text-foreground">{lastCandle[k].toFixed(current.digits)}</span>
              </span>
            ))}
          </div>
        )}
        <div className="p-2">
          <PriceChart candles={current.candles} digits={current.digits} lines={lines} className="h-[340px] lg:h-[460px]" />
        </div>
        {demo && (
          <p className="border-t border-border px-4 py-2 text-xs text-gold">
            بيانات توضيحية — أضف TWELVEDATA_API_KEY (مجاني) لعرض الأسعار الحقيقية.
          </p>
        )}
      </section>

      {/* قائمة المراقبة */}
      <aside className="order-first min-w-0 bg-card lg:order-none">
        <p className="hidden border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground lg:block">قائمة المراقبة</p>
        <ul className="flex overflow-x-auto lg:block">
          {series.map((s) => (
            <li key={s.symbol} className="shrink-0">
              <button
                onClick={() => setActive(s.symbol)}
                className={cn(
                  "flex w-full items-center justify-between gap-6 border-border px-4 py-3 text-start transition-colors hover:bg-secondary lg:border-b",
                  s.symbol === current.symbol && "bg-secondary",
                )}
              >
                <span>
                  <span className="num block text-sm font-semibold">{s.symbol}</span>
                  <span className="hidden text-[11px] text-muted-foreground lg:block">{s.name}</span>
                </span>
                <span className="text-end">
                  <span className="num block text-sm">{s.last.toFixed(s.digits)}</span>
                  <Change value={s.changePct} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {related.length > 0 && (
          <div className="hidden border-t border-border p-4 lg:block">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">توصيات مفتوحة على {current.symbol}</p>
            {related.map((s) => (
              <p key={s.id} className="num text-sm">
                <span className={s.direction === "BUY" ? "text-success" : "text-destructive"}>{s.direction}</span> @ {Number(s.entry_price)}
              </p>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
