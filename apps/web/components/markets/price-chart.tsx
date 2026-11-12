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
import { chartFont, chartPalette, useIsDark } from "@/lib/theme";

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
  const dark = useIsDark();

  // إنشاء الشارت مرة واحدة
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        fontFamily: chartFont(),
        fontSize: 11,
        attributionLogo: true,
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "en-US" },
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {});
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // ألوان الوضع الفاتح/الداكن
  useEffect(() => {
    const C = chartPalette(dark);
    chartRef.current?.applyOptions({
      layout: { textColor: C.text },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border },
    });
    seriesRef.current?.applyOptions({
      upColor: C.up,
      downColor: C.down,
      borderUpColor: C.up,
      borderDownColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
    });
  }, [dark]);

  // تحديث البيانات وخطوط التوصيات
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const COLORS = chartPalette(dark);
    series.applyOptions({ priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits } });
    series.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    const created = lines.map((l) =>
      series.createPriceLine({
        price: l.price,
        title: l.title,
        color: l.kind === "tp" ? COLORS.up : l.kind === "sl" ? COLORS.down : COLORS.line,
        lineWidth: 1,
        lineStyle: l.kind === "entry" ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
      }),
    );
    chartRef.current?.timeScale().fitContent();
    return () => created.forEach((pl) => series.removePriceLine(pl));
  }, [candles, digits, lines, dark]);

  return <div ref={containerRef} dir="ltr" style={className ? undefined : { height }} className={className ?? "w-full"} />;
}
