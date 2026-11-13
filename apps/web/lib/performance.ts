import { riskReward, type Signal } from "@qfx/shared";

/**
 * حسابات سجل الأداء من التوصيات المغلقة (دالة نقية قابلة للاختبار).
 * المحتسب: كل توصية مغلقة لها نتيجة بالنقاط (tp_hit / sl_hit / closed)، والملغاة مستبعدة.
 */
export interface Perf {
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalPips: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  maxDrawdown: number;
  best: Signal | null;
  worst: Signal | null;
  longestWinStreak: number;
  longestLossStreak: number;
  avgRR: number | null;
  equity: { date: string; value: number }[];
  monthly: { month: string; trades: number; wins: number; pips: number; winRate: number | null }[];
  bySymbol: { symbol: string; trades: number; wins: number; pips: number; winRate: number | null; avg: number }[];
  first: string | null;
  last: string | null;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const closedAt = (s: Signal) => s.closed_at ?? s.updated_at ?? s.created_at;

export function isScored(s: Signal): boolean {
  return s.status !== "cancelled" && ["tp_hit", "sl_hit", "closed"].includes(s.status) && s.result_pips !== null && !Number.isNaN(Number(s.result_pips));
}

export function computePerformance(all: Signal[]): Perf {
  const xs = all.filter(isScored).sort((a, b) => closedAt(a).localeCompare(closedAt(b)));
  const pips = xs.map((s) => Number(s.result_pips));
  const winsArr = pips.filter((p) => p > 0);
  const lossArr = pips.filter((p) => p < 0);
  const sumWin = winsArr.reduce((a, b) => a + b, 0);
  const sumLoss = lossArr.reduce((a, b) => a + b, 0);

  // منحنى الرصيد بالنقاط (آخر قيمة لكل يوم) وأقصى تراجع من القمة
  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  const byDay = new Map<string, number>();
  for (let i = 0; i < xs.length; i++) {
    cum += pips[i];
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
    byDay.set(closedAt(xs[i]).slice(0, 10), r1(cum));
  }

  // سلاسل الربح والخسارة المتتالية
  let ws = 0;
  let ls = 0;
  let bestW = 0;
  let bestL = 0;
  for (const p of pips) {
    if (p > 0) {
      ws++;
      ls = 0;
    } else if (p < 0) {
      ls++;
      ws = 0;
    }
    bestW = Math.max(bestW, ws);
    bestL = Math.max(bestL, ls);
  }

  const group = <K extends string>(key: (s: Signal) => K) => {
    const m = new Map<K, { trades: number; wins: number; pips: number }>();
    xs.forEach((s, i) => {
      const k = key(s);
      const g = m.get(k) ?? { trades: 0, wins: 0, pips: 0 };
      g.trades++;
      if (pips[i] > 0) g.wins++;
      g.pips += pips[i];
      m.set(k, g);
    });
    return m;
  };
  const decided = (g: { trades: number; wins: number }) => (g.trades ? r1((100 * g.wins) / g.trades) : null);

  const rrs = xs.map((s) => riskReward({ entry_price: Number(s.entry_price), stop_loss: s.stop_loss === null ? null : Number(s.stop_loss), take_profit_1: s.take_profit_1 === null ? null : Number(s.take_profit_1) })).filter((x): x is number => x !== null);
  const bestIdx = pips.length ? pips.indexOf(Math.max(...pips)) : -1;
  const worstIdx = pips.length ? pips.indexOf(Math.min(...pips)) : -1;

  return {
    trades: xs.length,
    wins: winsArr.length,
    losses: lossArr.length,
    winRate: winsArr.length + lossArr.length ? r1((100 * winsArr.length) / (winsArr.length + lossArr.length)) : null,
    totalPips: r1(cum),
    avgWin: winsArr.length ? r1(sumWin / winsArr.length) : 0,
    avgLoss: lossArr.length ? r1(sumLoss / lossArr.length) : 0,
    profitFactor: sumLoss < 0 ? Math.round((sumWin / Math.abs(sumLoss)) * 100) / 100 : null,
    expectancy: xs.length ? r1(cum / xs.length) : 0,
    maxDrawdown: r1(maxDD),
    best: bestIdx >= 0 ? xs[bestIdx] : null,
    worst: worstIdx >= 0 ? xs[worstIdx] : null,
    longestWinStreak: bestW,
    longestLossStreak: bestL,
    avgRR: rrs.length ? Math.round((rrs.reduce((a, b) => a + b, 0) / rrs.length) * 100) / 100 : null,
    equity: [...byDay].map(([date, value]) => ({ date, value })),
    monthly: [...group((s) => closedAt(s).slice(0, 7))]
      .map(([month, g]) => ({ month, ...g, pips: r1(g.pips), winRate: decided(g) }))
      .sort((a, b) => b.month.localeCompare(a.month)),
    bySymbol: [...group((s) => s.symbol)]
      .map(([symbol, g]) => ({ symbol, ...g, pips: r1(g.pips), winRate: decided(g), avg: r1(g.pips / g.trades) }))
      .sort((a, b) => b.pips - a.pips),
    first: xs.length ? closedAt(xs[0]) : null,
    last: xs.length ? closedAt(xs[xs.length - 1]) : null,
  };
}

/** سجل تجريبي ثابت (وضع المعاينة فقط) حتى تظهر الصفحة كاملة قبل ربط قاعدة البيانات */
export function demoHistory(now = Date.now()): Signal[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const syms: [string, Signal["asset_class"], number, number][] = [
    ["XAUUSD", "gold", 2600, 150],
    ["EURUSD", "forex", 1.09, 40],
    ["GBPUSD", "forex", 1.27, 50],
    ["USDJPY", "forex", 150, 45],
    ["WTI", "oil", 72, 80],
  ];
  const out: Signal[] = [];
  for (let i = 0; i < 72; i++) {
    const [symbol, asset_class, price, scale] = syms[Math.floor(rnd() * syms.length)];
    const win = rnd() < 0.62;
    const pips = Math.round((win ? 0.6 + rnd() : -(0.4 + rnd() * 0.5)) * scale);
    const closed = new Date(now - (150 - i * 2) * 86400000 - rnd() * 40000000).toISOString();
    const dir = rnd() > 0.5 ? "BUY" : "SELL";
    out.push({
      id: `demo-h-${i}`,
      symbol,
      asset_class,
      direction: dir,
      entry_price: price,
      stop_loss: dir === "BUY" ? price * 0.995 : price * 1.005,
      take_profit_1: dir === "BUY" ? price * 1.009 : price * 0.991,
      take_profit_2: null,
      take_profit_3: null,
      status: win ? "tp_hit" : "sl_hit",
      result_pips: pips,
      notes: null,
      source: "admin",
      telegram_message_id: null,
      opened_at: closed,
      closed_at: closed,
      created_at: closed,
      updated_at: closed,
    });
  }
  return out;
}
