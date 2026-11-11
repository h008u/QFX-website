"use client";

import { useEffect, useRef } from "react";
import { useIsDark } from "@/lib/theme";

/** ويدجتات TradingView الرسمية المجانية (تُحمّل من موقعهم مباشرة) */
export function TradingViewWidget({ kind, config, height = 520 }: { kind: "timeline" | "events"; config: Record<string, unknown>; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`;
    script.async = true;
    script.innerHTML = JSON.stringify({ colorTheme: dark ? "dark" : "light", isTransparent: true, locale: "ar_AE", width: "100%", height, ...config });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [kind, config, height, dark]);
  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg border border-border" style={{ height }} />;
}
