import Link from "next/link";
import { cn } from "@/lib/utils";
import { Change, fmtPrice } from "./price";
import { SymbolLogo } from "./symbol-logo";
import { marketHref } from "@/config/markets";

export interface WatchItem {
  symbol: string;
  name: string;
  digits: number;
  last: number;
  change: number;
  changePct: number;
}

/** لوحة قائمة المراقبة الجانبية (سطح المكتب): الرمز | السعر | التغير | التغير% */
export function WatchlistPanel({ items, active }: { items: WatchItem[]; active?: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center border-b border-border px-3 text-sm font-bold">قائمة المراقبة</div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>الرمز</span>
        <span className="text-end">السعر</span>
        <span className="w-14 text-end">التغير%</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {items.map((i) => (
          <li key={i.symbol}>
            <Link
              href={marketHref(i.symbol)}
              className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-3 py-2 text-[13px] hover:bg-secondary", i.symbol === active && "bg-primary/10")}
            >
              <span className="flex min-w-0 items-center gap-2">
                <SymbolLogo symbol={i.symbol} size={18} />
                <span className="num truncate font-semibold">{i.symbol}</span>
              </span>
              <span className="num text-end">{fmtPrice(i.last, i.digits)}</span>
              <Change pct={i.changePct} className="w-14 text-end text-[13px]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** قائمة المراقبة بأسلوب تطبيق الجوال: شعار + رمز + اسم، والسعر مع شارة تغيير ملوّنة */
export function WatchlistMobile({ items }: { items: WatchItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((i) => (
        <li key={i.symbol}>
          <Link href={marketHref(i.symbol)} className="flex items-center gap-3 px-4 py-3 active:bg-secondary">
            <SymbolLogo symbol={i.symbol} size={38} />
            <span className="min-w-0 flex-1">
              <span className="num block text-[16px] font-bold">{i.symbol}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{i.name}</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="num text-[16px] font-semibold">{fmtPrice(i.last, i.digits)}</span>
              <Change pct={i.changePct} chip />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
