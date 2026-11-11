"use client";

import { CURRENCY_LABEL, eventReadingText, IMPACT_ICON, sanitizeTelegramHtml } from "@qfx/shared";
import { Fragment, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface AgendaEvent {
  id: string;
  title: string;
  title_en: string;
  currency: string;
  impact: "high" | "medium" | "low";
  event_time: string;
  forecast: string | null;
  previous: string | null;
  dayLabel: string;
  timeLabel: string;
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(ms / 86400_000);
  const h = Math.floor((ms % 86400_000) / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <span className="num text-3xl font-bold text-primary" dir="ltr">
      {d > 0 && `${d}d `}
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function AgendaBoard({ events }: { events: AgendaEvent[] }) {
  const [impact, setImpact] = useState<"all" | "high">("all");
  const [cur, setCur] = useState("all");
  const currencies = [...new Set(events.map((e) => e.currency))];
  const list = useMemo(
    () => events.filter((e) => (impact === "all" || e.impact === "high") && (cur === "all" || e.currency === cur)),
    [events, impact, cur],
  );
  const next = events.find((e) => new Date(e.event_time).getTime() > Date.now() && e.impact === "high");
  const days = [...new Set(list.map((e) => e.dayLabel))];

  return (
    <div className="space-y-5">
      {next && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs text-muted-foreground">الخبر القوي القادم</p>
            <p className="mt-1 text-lg font-bold">
              {IMPACT_ICON[next.impact]} {next.title} <span className="text-sm font-normal text-muted-foreground">— {CURRENCY_LABEL[next.currency] ?? next.currency}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {next.dayLabel} {next.timeLabel} {next.forecast && `• المتوقع ${next.forecast}`} {next.previous && `• السابق ${next.previous}`}
            </p>
            {eventReadingText(next.currency, next.title_en) && (
              <p className="mt-3 text-xs leading-6 text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeTelegramHtml(eventReadingText(next.currency, next.title_en)).replace(/\n/g, "<br/>") }} />
            )}
          </div>
          <Countdown to={next.event_time} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "high"] as const).map((k) => (
          <button key={k} onClick={() => setImpact(k)} className={cn("rounded-full border px-3 py-1.5 text-xs", impact === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            {k === "all" ? "كل التأثيرات" : "🔴 المرتفع فقط"}
          </button>
        ))}
        <span className="mx-1 w-px bg-border" />
        {["all", ...currencies].map((c) => (
          <button key={c} onClick={() => setCur(c)} className={cn("num rounded-full border px-3 py-1.5 text-xs", cur === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            {c === "all" ? "كل العملات" : c}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
              <th>الوقت</th><th>العملة</th><th>التأثير</th><th>الحدث</th><th>المتوقع</th><th>السابق</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <Fragment key={day}>
                <tr className="bg-secondary/50">
                  <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold">{day}</td>
                </tr>
                {list
                  .filter((e) => e.dayLabel === day)
                  .map((e) => {
                    const past = new Date(e.event_time).getTime() < Date.now();
                    return (
                      <tr key={e.id} className={cn("border-t border-border/60 [&>td]:px-3 [&>td]:py-2.5", past && "opacity-50")}>
                        <td className="num">{e.timeLabel}</td>
                        <td className="num font-semibold">{e.currency}</td>
                        <td>{IMPACT_ICON[e.impact]}</td>
                        <td>
                          {e.title}
                          {!e.title.includes(e.title_en) && <span className="block text-[11px] text-muted-foreground">{e.title_en}</span>}
                        </td>
                        <td className="num">{e.forecast ?? "—"}</td>
                        <td className="num text-muted-foreground">{e.previous ?? "—"}</td>
                      </tr>
                    );
                  })}
              </Fragment>
            ))}
            {!list.length && (
              <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">لا أحداث — تُحدّث المزامنة كل ساعة من ForexFactory</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
