import { DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import { fmtPrice } from "./price";
import { SymbolLogo } from "./symbol-logo";

/** بطاقة توصية بأسلوب بطاقات "الأفكار": صورة شارت مصغرة + العنوان + الكاتب والوقت */
export function IdeaCard({ signal, spark, digits }: { signal: Signal; spark: number[]; digits: number }) {
  const buy = signal.direction === "BUY";
  const entry = Number(signal.entry_price);
  const sl = signal.stop_loss !== null ? Number(signal.stop_loss) : null;
  const tp = signal.take_profit_1 !== null ? Number(signal.take_profit_1) : null;
  const vals = [...spark, entry, ...(sl ? [sl] : []), ...(tp ? [tp] : [])];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const W = 400;
  const H = 210;
  const y = (v: number) => H - 14 - ((v - min) / (max - min || 1)) * (H - 28);
  const path = spark.map((v, i) => `${i ? "L" : "M"}${((i / (spark.length - 1)) * (W - 60)).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const closed = !["open", "pending"].includes(signal.status);
  return (
    <Link href={`/markets?s=${signal.symbol}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface transition-shadow group-hover:shadow-lg">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" preserveAspectRatio="none" aria-hidden>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="hsl(var(--border))" strokeWidth="1" />
          ))}
          <path d={path} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.6" opacity="0.8" />
          {tp && <rect x={W - 60} y={Math.min(y(tp), y(entry))} width="60" height={Math.abs(y(tp) - y(entry))} fill="#089981" opacity="0.18" />}
          {sl && <rect x={W - 60} y={Math.min(y(sl), y(entry))} width="60" height={Math.abs(y(sl) - y(entry))} fill="#F23645" opacity="0.18" />}
          <line x1={W - 60} x2={W} y1={y(entry)} y2={y(entry)} stroke="#2962FF" strokeWidth="2" />
        </svg>
        <span className={cn("absolute end-3 top-3 rounded px-2 py-0.5 text-xs font-bold text-white", buy ? "bg-success" : "bg-destructive")}>
          {DIRECTION_LABEL[signal.direction]}
        </span>
        {closed && (
          <span className="absolute start-3 top-3 rounded bg-background/90 px-2 py-0.5 text-xs font-semibold">
            {STATUS_LABEL[signal.status]} {signal.result_pips !== null && <b className={cn("num", Number(signal.result_pips) >= 0 ? "text-up" : "text-down")}>{Number(signal.result_pips) > 0 ? "+" : ""}{signal.result_pips}</b>}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <SymbolLogo symbol={signal.symbol} size={20} />
        <span className="num text-sm font-bold">{signal.symbol}</span>
        <span className="text-xs text-muted-foreground">• {timeAgo(signal.created_at)}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[17px] font-bold leading-7 group-hover:text-primary">
        {DIRECTION_LABEL[signal.direction]} {signal.symbol} من {fmtPrice(entry, digits)}
        {tp ? ` — الهدف ${fmtPrice(tp, digits)}` : ""}
      </p>
      {signal.notes && <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{signal.notes}</p>}
      <p className="mt-2 text-xs font-semibold text-muted-foreground">QFX {signal.strategy ? `• ${signal.strategy}` : ""}</p>
    </Link>
  );
}
