"use client";

import { CLOSED_STATUSES, DIRECTION_LABEL, STATUS_LABEL, type Signal } from "@qfx/shared";
import { useMemo, useState } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useRealtimeTable } from "@/lib/use-realtime";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";
import { SignalCard, statusVariant } from "./signal-card";

type Tab = "open" | "history";

export function SignalsBoard({ initial, demo }: { initial: Signal[]; demo: boolean }) {
  const { rows, live } = useRealtimeTable("signals", initial);
  const [tab, setTab] = useState<Tab>("open");

  const open = useMemo(() => rows.filter((s) => !CLOSED_STATUSES.includes(s.status)), [rows]);
  const history = useMemo(() => rows.filter((s) => CLOSED_STATUSES.includes(s.status)), [rows]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1">
          {(
            [
              ["open", `التوصيات الحية (${open.length})`],
              ["history", `السجل التاريخي (${history.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <LiveIndicator live={live} demo={demo} />
      </div>

      {tab === "open" ? (
        open.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((s) => (
              <SignalCard key={s.id} signal={s} withComments />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">
            لا توجد توصيات مفتوحة حالياً — تابع قناة التيليجرام لتصلك فور صدورها.
          </Card>
        )
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium">
                <th>التاريخ</th>
                <th>الأداة</th>
                <th>الاتجاه</th>
                <th>الدخول</th>
                <th>الوقف</th>
                <th>الهدف</th>
                <th>الحالة</th>
                <th>النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 [&>td]:px-4 [&>td]:py-3">
                  <td className="text-muted-foreground">{formatDateTime(s.closed_at ?? s.created_at)}</td>
                  <td className="num font-semibold">{s.symbol}</td>
                  <td className={s.direction === "BUY" ? "text-success" : "text-destructive"}>{DIRECTION_LABEL[s.direction]}</td>
                  <td className="num">{formatPrice(s.entry_price)}</td>
                  <td className="num">{formatPrice(s.stop_loss)}</td>
                  <td className="num">{formatPrice(s.take_profit_1)}</td>
                  <td>
                    <Badge variant={statusVariant(s.status)}>{STATUS_LABEL[s.status]}</Badge>
                  </td>
                  <td
                    className={cn(
                      "num font-bold",
                      s.result_pips === null
                        ? "text-muted-foreground"
                        : Number(s.result_pips) >= 0
                          ? "text-success"
                          : "text-destructive",
                    )}
                  >
                    {s.result_pips === null ? "—" : `${Number(s.result_pips) > 0 ? "+" : ""}${s.result_pips}`}
                  </td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    لا يوجد سجل بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
