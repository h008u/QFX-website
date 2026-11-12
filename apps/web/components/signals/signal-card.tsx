import { ASSET_LABEL, DIRECTION_LABEL, STATUS_LABEL, riskReward, type Signal } from "@qfx/shared";
import Link from "next/link";
import { CommentThread } from "@/components/community/comment-thread";
import { SymbolLogo } from "@/components/market/symbol-logo";
import { cn, formatPrice, timeAgo } from "@/lib/utils";

export function statusVariant(status: Signal["status"]) {
  switch (status) {
    case "tp_hit":
      return "success" as const;
    case "sl_hit":
      return "danger" as const;
    case "open":
      return "info" as const;
    case "pending":
      return "gold" as const;
    default:
      return "outline" as const;
  }
}

const STATUS_TONE: Record<string, string> = {
  success: "text-up",
  danger: "text-down",
  info: "text-primary",
  gold: "text-amber-500",
  outline: "text-muted-foreground",
};

function Level({ label, value, tone }: { label: string; value: number | null; tone?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className={cn("num mt-0.5 truncate text-[17px] font-semibold", tone)}>{formatPrice(value)}</p>
    </div>
  );
}

/** بطاقة توصية بأسلوب "الأفكار": رأس بالشعار والرمز، ومستويات مسطّحة كإحصائيات */
export function SignalCard({ signal, withComments = false }: { signal: Signal; withComments?: boolean }) {
  const buy = signal.direction === "BUY";
  const rr = riskReward({
    entry_price: Number(signal.entry_price),
    stop_loss: Number(signal.stop_loss),
    take_profit_1: Number(signal.take_profit_1),
  });
  const tps = [signal.take_profit_2, signal.take_profit_3].filter((x) => x !== null && x !== undefined);
  return (
    <article className="animate-fade-in rounded-xl border border-border p-4 transition-colors hover:border-input">
      <div className="flex items-center gap-3">
        <SymbolLogo symbol={signal.symbol} size={36} />
        <div className="min-w-0 flex-1">
          <Link href={`/markets?s=${signal.symbol}`} className="num text-[17px] font-bold hover:text-primary">
            {signal.symbol}
          </Link>
          <p className="text-xs text-muted-foreground">
            {ASSET_LABEL[signal.asset_class]} • {timeAgo(signal.created_at)}
          </p>
        </div>
        <span className={cn("rounded px-2 py-0.5 text-xs font-bold text-white", buy ? "bg-success" : "bg-destructive")}>
          {DIRECTION_LABEL[signal.direction]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border py-3">
        <Level label="الدخول" value={signal.entry_price} />
        <Level label="وقف الخسارة" value={signal.stop_loss} tone="text-down" />
        <Level label="الهدف 1" value={signal.take_profit_1} tone="text-up" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        <span className={cn("font-semibold", STATUS_TONE[statusVariant(signal.status)])}>● {STATUS_LABEL[signal.status]}</span>
        {rr ? (
          <span className="text-muted-foreground">
            العائد/المخاطرة <span className="num text-foreground">1:{rr}</span>
          </span>
        ) : null}
        {tps.length > 0 && (
          <span className="text-muted-foreground">
            أهداف إضافية <span className="num text-up">{tps.map((x) => formatPrice(x as number)).join(" / ")}</span>
          </span>
        )}
        {signal.result_pips !== null && (
          <span className={cn("num ms-auto font-bold", Number(signal.result_pips) >= 0 ? "text-up" : "text-down")}>
            {Number(signal.result_pips) > 0 ? "+" : ""}
            {signal.result_pips} نقطة
          </span>
        )}
      </div>
      {signal.notes && <p className="mt-3 text-sm leading-7 text-muted-foreground">{signal.notes}</p>}
      {withComments && <CommentThread target="signal" targetId={signal.id} />}
    </article>
  );
}
