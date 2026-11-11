import { CLOSED_STATUSES } from "@qfx/shared";
import type { Metadata } from "next";
import { MarketsTerminal } from "@/components/markets/markets-terminal";
import { getSignals } from "@/lib/data";
import { getMarkets } from "@/lib/market-data";

export const metadata: Metadata = {
  title: "الأسواق والشارت",
  description: "شارت حي للعملات والذهب مع مستويات التوصيات المفتوحة (الدخول، الوقف، الأهداف).",
};

export const revalidate = 900;

export default async function MarketsPage() {
  const [{ series, demo }, { data: signals }] = await Promise.all([getMarkets(), getSignals(100)]);
  const open = signals.filter((s) => !CLOSED_STATUSES.includes(s.status));

  return (
    <div className="container space-y-6 py-8 md:py-12">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">الأسواق</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مستويات التوصيات المفتوحة تُرسم مباشرة على الشارت: الدخول، وقف الخسارة، والأهداف.
        </p>
      </div>
      <MarketsTerminal
        demo={demo}
        signals={open}
        series={series.map((s) => ({
          symbol: s.symbol.symbol,
          name: s.symbol.name,
          digits: s.symbol.digits,
          candles: s.candles,
          last: s.last,
          changePct: s.changePct,
        }))}
      />
      <p className="text-[11px] text-muted-foreground">
        الشارت مبني بمكتبة TradingView Lightweight Charts™ مفتوحة المصدر. الأسعار للاطلاع فقط وقد تتأخر عن أسعار التنفيذ لدى الوسيط.
      </p>
    </div>
  );
}
