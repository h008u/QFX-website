"use client";

import { BaselineSeries, ColorType, createChart, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { chartFont, chartPalette, useIsDark } from "@/lib/theme";

/** منحنى النقاط التراكمي: أخضر فوق الصفر وأحمر تحته، مع تكبير وتمرير */
export function EquityCurve({ points }: { points: { date: string; value: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  useEffect(() => {
    if (!ref.current || !points.length) return;
    const C = chartPalette(dark);
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: C.text, fontFamily: chartFont(), fontSize: 12, attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: C.grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderColor: C.border },
      crosshair: { horzLine: { labelBackgroundColor: C.blue }, vertLine: { labelBackgroundColor: C.blue } },
    });
    const s = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      topLineColor: C.up,
      topFillColor1: `${C.up}55`,
      topFillColor2: `${C.up}08`,
      bottomLineColor: C.down,
      bottomFillColor1: `${C.down}08`,
      bottomFillColor2: `${C.down}55`,
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}` },
    });
    s.setData(points.map((p) => ({ time: (Date.parse(p.date) / 1000) as UTCTimestamp, value: p.value })));
    s.createPriceLine({ price: 0, color: C.border, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points, dark]);
  return <div ref={ref} dir="ltr" className="h-[320px] w-full md:h-[380px]" />;
}
