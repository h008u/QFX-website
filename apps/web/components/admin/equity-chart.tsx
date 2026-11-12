"use client";

import { AreaSeries, ColorType, createChart, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { CHART_FONT, chartPalette, useIsDark } from "@/lib/theme";

/** منحنى النقاط التراكمي */
export function EquityChart({ points }: { points: { time: number; value: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  useEffect(() => {
    if (!ref.current) return;
    const C = chartPalette(dark);
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: C.text, fontFamily: CHART_FONT, fontSize: 11 },
      grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border },
      handleScroll: false,
      handleScale: false,
    });
    const last = points.at(-1)?.value ?? 0;
    const color = last >= 0 ? C.up : C.down;
    const s = chart.addSeries(AreaSeries, { lineColor: color, topColor: `${color}55`, bottomColor: `${color}05`, lineWidth: 2, priceFormat: { type: "price", precision: 1, minMove: 0.1 } });
    // نقاط بنفس الثانية تُدمج (lightweight-charts يتطلب أوقاتاً متزايدة)
    const dedup = new Map<number, number>();
    points.forEach((p) => dedup.set(p.time, p.value));
    s.setData([...dedup.entries()].sort((a, b) => a[0] - b[0]).map(([time, value]) => ({ time: time as UTCTimestamp, value })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points, dark]);
  return <div ref={ref} dir="ltr" className="h-64 w-full" />;
}
