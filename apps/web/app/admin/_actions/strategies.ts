"use server";

import { demoBars, DEFAULT_SETTINGS, simulate, STRATEGIES, TF_MS, type Bar, type BacktestResult, type StrategyId, type Timeframe } from "@qfx/shared";
import { revalidatePath } from "next/cache";
import { audit, requireRole } from "@/lib/admin/session";
import { loadAdminSettings } from "@/lib/admin/settings";

const providerSymbol = (s: string) => (/^[A-Z]{6}$/.test(s) ? `${s.slice(0, 3)}/${s.slice(3)}` : s);

async function history(symbol: string, tf: Timeframe): Promise<{ bars: Bar[]; demo: boolean }> {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) return { bars: demoBars(symbol, 2000, TF_MS[tf]), demo: true };
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(providerSymbol(symbol))}&interval=${tf}&outputsize=3000&timezone=UTC&apikey=${key}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const json = (await res.json()) as { status?: string; message?: string; values?: Record<string, string>[] };
  if (json.status !== "ok" || !json.values) throw new Error(json.message ?? "تعذّر جلب الشموع التاريخية");
  const bars = json.values
    .map((v) => [Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000), +v.open, +v.high, +v.low, +v.close] as Bar)
    .filter((b) => b.every(Number.isFinite))
    .sort((a, b) => a[0] - b[0]);
  return { bars, demo: false };
}

export interface BacktestResponse {
  ok: boolean;
  message?: string;
  result?: BacktestResult & { demo: boolean };
}

/** يختبر الاستراتيجية بإعداداتها الحالية على الشموع التاريخية ويحفظ النتيجة */
export async function runBacktestAction(id: string, symbol: string): Promise<BacktestResponse> {
  const ctx = await requireRole("editor");
  if (!STRATEGIES[id as StrategyId]) return { ok: false, message: "استراتيجية غير معروفة" };
  const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (sym.length < 3) return { ok: false, message: "رمز غير صالح" };
  const s = await loadAdminSettings(ctx);
  const cfg = s.strategies.list.find((x) => x.id === id) ?? DEFAULT_SETTINGS.strategies.list.find((x) => x.id === id)!;
  try {
    const { bars, demo } = await history(sym, cfg.tf);
    if (bars.length < 260) return { ok: false, message: `شموع تاريخية قليلة (${bars.length}) — تحتاج 260 على الأقل` };
    const result = simulate(id as StrategyId, bars, { ...cfg, confirm: cfg.confirm }, sym);
    await ctx.db.from("backtests").insert({
      strategy: id,
      symbol: sym,
      timeframe: cfg.tf,
      params: cfg,
      stats: { trades: result.trades, wins: result.wins, losses: result.losses, winRate: result.winRate, pips: result.pips, profitFactor: result.profitFactor, maxDrawdown: result.maxDrawdown, bars: result.bars, from: result.from, to: result.to, demo },
      trades: result.last,
      equity: result.curve,
      created_by: ctx.demo ? null : ctx.user.id,
    });
    await audit(ctx, "strategy.backtest", `${id} ${sym}`);
    revalidatePath("/admin/strategies");
    return { ok: true, result: { ...result, demo } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "فشل الاختبار" };
  }
}
