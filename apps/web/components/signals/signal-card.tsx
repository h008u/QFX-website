import { ASSET_LABEL, DIRECTION_LABEL, STATUS_LABEL, riskReward, type Signal } from "@qfx/shared";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CommentThread } from "@/components/community/comment-thread";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

function Level({ label, value, tone }: { label: string; value: number | null; tone?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-semibold", tone)}>{formatPrice(value)}</span>
    </div>
  );
}

export function SignalCard({ signal, withComments = false }: { signal: Signal; withComments?: boolean }) {
  const buy = signal.direction === "BUY";
  const rr = riskReward({
    entry_price: Number(signal.entry_price),
    stop_loss: Number(signal.stop_loss),
    take_profit_1: Number(signal.take_profit_1),
  });
  return (
    <Card className="animate-fade-in p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-lg",
              buy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {buy ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          </span>
          <div>
            <p className="num text-lg font-bold">{signal.symbol}</p>
            <p className="text-xs text-muted-foreground">
              {DIRECTION_LABEL[signal.direction]} • {ASSET_LABEL[signal.asset_class]} • {timeAgo(signal.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant(signal.status)}>{STATUS_LABEL[signal.status]}</Badge>
      </div>

      <div className="mt-4 grid gap-1.5">
        <Level label="الدخول" value={signal.entry_price} />
        <Level label="وقف الخسارة" value={signal.stop_loss} tone="text-destructive" />
        <Level label="الهدف 1" value={signal.take_profit_1} tone="text-success" />
        <Level label="الهدف 2" value={signal.take_profit_2} tone="text-success" />
        <Level label="الهدف 3" value={signal.take_profit_3} tone="text-success" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {rr ? (
            <>
              العائد/المخاطرة <span className="num">1:{rr}</span>
            </>
          ) : null}
        </span>
        {signal.result_pips !== null && (
          <span className={cn("num text-sm font-bold", Number(signal.result_pips) >= 0 ? "text-success" : "text-destructive")}>
            {Number(signal.result_pips) > 0 ? "+" : ""}
            {signal.result_pips} نقطة
          </span>
        )}
      </div>
      {signal.notes && <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{signal.notes}</p>}
      {withComments && <CommentThread target="signal" targetId={signal.id} />}
    </Card>
  );
}
