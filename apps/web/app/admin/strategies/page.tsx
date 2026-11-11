import { STRATEGIES, type StrategyId } from "@qfx/shared";
import { StrategiesPanel, type LiveStats } from "@/components/admin/strategies-panel";
import { PageHeader, Section } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/admin/format";
import { canEdit, getAdminContext } from "@/lib/admin/session";
import { loadAdminSettings, loadState } from "@/lib/admin/settings";

export const metadata = { title: "بوتات التحليل" };

export default async function StrategiesPage() {
  const ctx = (await getAdminContext())!;
  const s = await loadAdminSettings(ctx);
  const [{ data: sigs }, st, { data: tests }] = await Promise.all([
    ctx.db.from("signals").select("status, result_pips, meta").eq("source", "strategy").limit(2000),
    loadState<{ skipped?: { at: string; strategy: string; symbol: string; dir: string; reason: string }[] }>(ctx, "strategies", {}),
    ctx.db.from("backtests").select("strategy, symbol, timeframe, stats, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const live: Record<string, LiveStats> = {};
  for (const x of sigs ?? []) {
    const id = (x.meta as { strategy_id?: string } | null)?.strategy_id;
    if (!id) continue;
    const l = (live[id] ??= { signals: 0, wins: 0, losses: 0, pips: 0, open: 0 });
    if (x.status === "open" || x.status === "pending") {
      l.open++;
      continue;
    }
    if (x.result_pips === null) continue;
    l.signals++;
    const p = Number(x.result_pips);
    l.pips = Math.round((l.pips + p) * 10) / 10;
    if (p > 0) l.wins++;
    else if (p < 0) l.losses++;
  }
  const tz = s.general.timezone;
  return (
    <>
      <PageHeader
        title="بوتات التحليل"
        description="9 استراتيجيات (منقولة من Spir) تحلل السوق بعد إغلاق كل شمعة وتصدر إشارة بالدخول والوقف وهدفين. الهدف الأول ينقل الوقف للدخول، والهدف الثاني أو الوقف يغلقها، وكل تحديث ينزل كرد على الإشارة. السجل حقيقي من متابعة السعر."
      />
      <StrategiesPanel initial={s.strategies} live={live} canEdit={canEdit(ctx.role)} />
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="⛔ إشارات منعتها الفلاتر" description="آخر 40 إشارة لم تُنشر وسبب ذلك.">
          <ul className="space-y-1.5 text-sm">
            {(st.skipped ?? []).map((k, i) => (
              <li key={i} className="flex flex-wrap gap-2">
                <span className="num text-xs text-muted-foreground">{fmtDateTime(k.at, tz)}</span>
                <span>{STRATEGIES[k.strategy as StrategyId]?.name ?? k.strategy}</span>
                <span className="num">{k.dir === "buy" ? "🟢" : "🔴"} {k.symbol}</span>
                <span className="text-muted-foreground">— {k.reason}</span>
              </li>
            ))}
            {!st.skipped?.length && <li className="text-muted-foreground">لا شيء</li>}
          </ul>
        </Section>
        <Section title="🧪 آخر الاختبارات">
          <ul className="space-y-1.5 text-sm">
            {(tests ?? []).map((t, i) => {
              const st2 = t.stats as { trades: number; winRate: number | null; pips: number; profitFactor: number | null; demo?: boolean };
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="num text-xs text-muted-foreground">{fmtDateTime(t.created_at, tz)}</span>
                  <span>{STRATEGIES[t.strategy as StrategyId]?.name}</span>
                  <span className="num">{t.symbol} {t.timeframe}</span>
                  <span className="num text-muted-foreground">{st2.trades} صفقة • {st2.winRate ?? "—"}% • {st2.pips > 0 ? "+" : ""}{st2.pips} • PF {st2.profitFactor ?? "∞"}</span>
                  {st2.demo && <span className="text-[10px] text-gold">توضيحي</span>}
                </li>
              );
            })}
            {!tests?.length && <li className="text-muted-foreground">لم تُشغّل اختبارات بعد</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}
