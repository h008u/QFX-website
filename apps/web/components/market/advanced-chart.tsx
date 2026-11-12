"use client";

import {
  AreaSeries, BarSeries, CandlestickSeries, ColorType, createChart, CrosshairMode, LineSeries, LineStyle,
  type IChartApi, type ISeriesApi, type MouseEventParams, type SeriesType, type Time, type UTCTimestamp,
} from "lightweight-charts";
import { CandlestickChart, ChartLine, ChartNoAxesColumn, Maximize2, Minimize2, Spline } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHART_FONT, chartPalette, useIsDark } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { fmtPrice } from "./price";

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
export interface ChartLevel {
  price: number;
  title: string;
  kind: "entry" | "sl" | "tp";
}

type Tf = "1H" | "4H" | "1D";
type Kind = "candles" | "bars" | "line" | "area";
const TF_HOURS: Record<Tf, number> = { "1H": 1, "4H": 4, "1D": 24 };
const KINDS: { k: Kind; icon: typeof CandlestickChart; label: string }[] = [
  { k: "candles", icon: CandlestickChart, label: "شموع" },
  { k: "bars", icon: ChartNoAxesColumn, label: "أعمدة" },
  { k: "line", icon: ChartLine, label: "خط" },
  { k: "area", icon: Spline, label: "منطقة" },
];

function aggregate(candles: ChartCandle[], hours: number): ChartCandle[] {
  if (hours === 1) return candles;
  const size = hours * 3600;
  const out: ChartCandle[] = [];
  for (const c of candles) {
    const t = Math.floor(c.time / size) * size;
    const last = out.at(-1);
    if (last && last.time === t) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
    } else out.push({ ...c, time: t });
  }
  return out;
}

/** شارت بأسلوب منصات التحليل: شريط أدوات، أسطورة OHLC تتبع المؤشر، وأنواع رسم متعددة */
export function AdvancedChart({
  symbol,
  candles,
  digits,
  levels = [],
  className,
  compactToolbar,
}: {
  symbol: string;
  candles: ChartCandle[];
  digits: number;
  levels?: ChartLevel[];
  className?: string;
  compactToolbar?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const dark = useIsDark();
  const [tf, setTf] = useState<Tf>("1H");
  const [kind, setKind] = useState<Kind>("candles");
  const [full, setFull] = useState(false);
  const data = useMemo(() => aggregate(candles, TF_HOURS[tf]), [candles, tf]);
  const [hover, setHover] = useState<ChartCandle | null>(null);
  const shown = hover ?? data.at(-1) ?? null;
  const prev = shown ? data[data.findIndex((c) => c.time === shown.time) - 1] : undefined;

  useEffect(() => {
    if (!box.current) return;
    const C = chartPalette(dark);
    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: C.text, fontFamily: CHART_FONT, fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 8 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: dark ? "#9598A1" : "#9598A1", style: LineStyle.Dashed, labelBackgroundColor: dark ? "#2A2E39" : "#131722" },
        horzLine: { color: "#9598A1", style: LineStyle.Dashed, labelBackgroundColor: dark ? "#2A2E39" : "#131722" },
      },
      localization: { locale: "en-US", priceFormatter: (p: number) => fmtPrice(p, digits) },
    });
    chartRef.current = chart;
    const onMove = (p: MouseEventParams<Time>) => {
      const s = seriesRef.current;
      const d = s && p.seriesData.get(s);
      if (!d || !p.time) return setHover(null);
      const v = d as { open?: number; high?: number; low?: number; close?: number; value?: number };
      setHover({ time: p.time as number, open: v.open ?? v.value!, high: v.high ?? v.value!, low: v.low ?? v.value!, close: v.close ?? v.value! });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [dark, digits]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const C = chartPalette(dark);
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    const fmt = { type: "price" as const, precision: digits, minMove: 1 / 10 ** digits };
    const t = (c: ChartCandle) => c.time as UTCTimestamp;
    let series: ISeriesApi<SeriesType>;
    if (kind === "candles") {
      series = chart.addSeries(CandlestickSeries, { upColor: C.up, downColor: C.down, borderUpColor: C.up, borderDownColor: C.down, wickUpColor: C.up, wickDownColor: C.down, priceFormat: fmt });
      series.setData(data.map((c) => ({ ...c, time: t(c) })));
    } else if (kind === "bars") {
      series = chart.addSeries(BarSeries, { upColor: C.up, downColor: C.down, thinBars: false, priceFormat: fmt });
      series.setData(data.map((c) => ({ ...c, time: t(c) })));
    } else if (kind === "line") {
      series = chart.addSeries(LineSeries, { color: C.blue, lineWidth: 2, priceFormat: fmt });
      series.setData(data.map((c) => ({ time: t(c), value: c.close })));
    } else {
      series = chart.addSeries(AreaSeries, { lineColor: C.blue, topColor: C.area, bottomColor: "rgba(41,98,255,0)", lineWidth: 2, priceFormat: fmt });
      series.setData(data.map((c) => ({ time: t(c), value: c.close })));
    }
    for (const l of levels) {
      series.createPriceLine({
        price: l.price,
        title: l.title,
        color: l.kind === "tp" ? C.up : l.kind === "sl" ? C.down : C.blue,
        lineWidth: 1,
        lineStyle: l.kind === "entry" ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
      });
    }
    seriesRef.current = series;
    chart.timeScale().fitContent();
    chart.timeScale().scrollToPosition(6, false);
  }, [data, kind, levels, digits, dark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const up = shown && prev ? shown.close >= prev.close : true;
  return (
    <div ref={wrap} className={cn("flex flex-col bg-background", full ? "fixed inset-0 z-[80]" : "", className)}>
      {/* شريط الأدوات العلوي */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2" dir="ltr">
        <span className="px-2 text-sm font-bold">{symbol}</span>
        <span className="mx-1 h-5 w-px bg-border" />
        {(Object.keys(TF_HOURS) as Tf[]).map((x) => (
          <button key={x} onClick={() => setTf(x)} className={cn("h-8 rounded-md px-2.5 text-[13px] font-semibold transition-colors hover:bg-secondary", tf === x ? "text-primary" : "text-foreground")}>
            {x}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {KINDS.filter((k) => !compactToolbar || k.k === "candles" || k.k === "area").map(({ k, icon: Icon, label }) => (
          <button key={k} onClick={() => setKind(k)} title={label} aria-label={label} className={cn("grid h-8 w-8 place-items-center rounded-md hover:bg-secondary", kind === k ? "text-primary" : "text-foreground")}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </button>
        ))}
        <button onClick={() => setFull((v) => !v)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-secondary" aria-label="ملء الشاشة" title="ملء الشاشة">
          {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {/* الأسطورة: الرمز والإطار و OHLC (تتبع مؤشر الفأرة) */}
        {shown && (
          <div className="pointer-events-none absolute left-3 right-20 top-2 z-10 flex flex-wrap items-center gap-x-3 text-[12px]" dir="ltr">
            <span className="font-semibold text-foreground">{symbol} · {tf}</span>
            {(["open", "high", "low", "close"] as const).map((k) => (
              <span key={k} className="num text-muted-foreground">
                {k[0].toUpperCase()}
                <span className={cn("ml-0.5", up ? "text-up" : "text-down")}>{fmtPrice(shown[k], digits)}</span>
              </span>
            ))}
            {prev && (
              <span className={cn("num", up ? "text-up" : "text-down")}>
                {up ? "+" : ""}
                {fmtPrice(shown.close - prev.close, digits)} ({up ? "+" : ""}
                {(((shown.close - prev.close) / prev.close) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
        )}
        <div ref={box} dir="ltr" className="absolute inset-0" />
      </div>
    </div>
  );
}
