import Link from "next/link";
import { getMarkets } from "@/lib/market-data";
import { marketHref } from "@/config/markets";
import { LivePrice, TickerChange } from "@/components/market/live-quotes";

/** شريط أسعار متحرك أعلى الموقع (يظهر في ثيمات المؤسسي والطرفية والذهبي) */
export async function TickerTape() {
  const { series } = await getMarkets();
  const items = series.map((s) => ({ symbol: s.meta.symbol, last: s.last, pct: s.changePct, digits: s.meta.digits }));
  const row = (hidden?: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pe-8" aria-hidden={hidden}>
      {items.map((i) => (
        <li key={i.symbol}>
          <Link href={marketHref(i.symbol)} className="num flex items-center gap-2 text-[12.5px] hover:opacity-80" tabIndex={hidden ? -1 : undefined}>
            <b className="font-semibold">{i.symbol}</b>
            <LivePrice symbol={i.symbol} value={i.last} digits={i.digits} className="opacity-80" />
            <TickerChange symbol={i.symbol} pct={i.pct} />
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker-tape overflow-hidden border-b border-border bg-panel py-2 text-panel-foreground" dir="ltr">
      <div className="ticker-track flex w-max">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
