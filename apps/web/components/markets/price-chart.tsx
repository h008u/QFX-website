"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartPriceLine {
  price: number;
  title: string;
  kind: "entry" | "sl" | "tp";
}

const COLORS = {
  up: "#10B981",
  down: "#FF3B30",
  text: "#A1A1AA",
  grid: "#1C1C1F",
  border: "#27272A",
  entry: "#E4E4E7",
};

/** شارت شموع باستخدام مكتبة TradingView Lightweight Charts (Apache-2.0) */
export function PriceChart({
  candles,
  digits,
  lines = [],
  height = 420,
  className,
}: {
  candles: ChartCandle[];
  digits: number;
  lines?: ChartPriceLine[];
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // إنشاء الشارت مرة واحدة
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "en-US" },
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // تحديث البيانات وخطوط التوصيات
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.applyOptions({ priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits } });
    series.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    const created = lines.map((l) =>
      series.createPriceLine({
        price: l.price,
        title: l.title,
        color: l.kind === "tp" ? COLORS.up : l.kind === "sl" ? COLORS.down : COLORS.entry,
        lineWidth: 1,
        lineStyle: l.kind === "entry" ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
      }),
    );
    chartRef.current?.timeScale().fitContent();
    return () => created.forEach((pl) => series.removePriceLine(pl));
  }, [candles, digits, lines]);

  return <div ref={containerRef} dir="ltr" style={className ? undefined : { height }} className={className ?? "w-full"} />;
}
