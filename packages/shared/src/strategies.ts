// بوتات التحليل: المؤشرات والاستراتيجيات والاختبار على التاريخ (منقولة من Spir-Telegrambot)
// bars: [[وقت بالثواني، فتح، أعلى، أدنى، إغلاق], ...] من الأقدم للأحدث
import { pipSize } from "./signals";

export type Bar = [number, number, number, number, number];
export type Row = Record<string, number | null> & { time: number; open: number; high: number; low: number; close: number };
export type Dir = "buy" | "sell";

const ema = (vals: (number | null)[], n: number) => {
  const out: (number | null)[] = Array(vals.length).fill(null);
  const k = 2 / (n + 1);
  let prev: number | null = null;
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as number;
    if (i < n - 1) {
      sum += v;
      continue;
    }
    if (i === n - 1) {
      sum += v;
      prev = sum / n;
    } else prev = v * k + (prev as number) * (1 - k);
    out[i] = prev;
  }
  return out;
};
const sma = (vals: number[], n: number) => vals.map((_, i) => (i < n - 1 ? null : vals.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));
const wilder = (vals: (number | null)[], n: number, start = 0) => {
  const out: (number | null)[] = Array(vals.length).fill(null);
  let prev: number | null = null;
  for (let i = start; i < vals.length; i++) {
    if (vals[i] === null) continue;
    if (i < start + n - 1) continue;
    if (prev === null) prev = (vals.slice(i - n + 1, i + 1) as number[]).reduce((a, b) => a + b, 0) / n;
    else prev = (prev * (n - 1) + (vals[i] as number)) / n;
    out[i] = prev;
  }
  return out;
};
const hh = (arr: number[], i: number, n: number) => Math.max(...arr.slice(Math.max(0, i - n + 1), i + 1));
const ll = (arr: number[], i: number, n: number) => Math.min(...arr.slice(Math.max(0, i - n + 1), i + 1));

/** يحسب كل المؤشرات لكل شمعة (نفس أسماء أعمدة TradingView) */
export function computeRows(bars: Bar[]): Row[] {
  const o = bars.map((b) => b[1]);
  const hi = bars.map((b) => b[2]);
  const lo = bars.map((b) => b[3]);
  const c = bars.map((b) => b[4]);
  const N = bars.length;
  const e20 = ema(c, 20), e50 = ema(c, 50), e200 = ema(c, 200), s20 = sma(c, 20);
  const gain = c.map((v, i) => (i ? Math.max(0, v - c[i - 1]) : null));
  const loss = c.map((v, i) => (i ? Math.max(0, c[i - 1] - v) : null));
  const ag = wilder(gain, 14, 1), al = wilder(loss, 14, 1);
  // بدون أي حركة (لا ربح ولا خسارة) RSI = 50 وليس 100
  const rsi = c.map((_, i) => (ag[i] === null ? null : al[i] === 0 ? (ag[i] === 0 ? 50 : 100) : 100 - 100 / (1 + (ag[i] as number) / (al[i] as number))));
  const e12 = ema(c, 12), e26 = ema(c, 26);
  const macd = c.map((_, i) => (e12[i] === null || e26[i] === null ? null : (e12[i] as number) - (e26[i] as number)));
  const firstM = macd.findIndex((v) => v !== null);
  const sig: (number | null)[] = Array(N).fill(null);
  if (firstM >= 0) ema(macd.slice(firstM), 9).forEach((v, j) => (sig[firstM + j] = v));
  const tr = c.map((_, i) => (i ? Math.max(hi[i] - lo[i], Math.abs(hi[i] - c[i - 1]), Math.abs(lo[i] - c[i - 1])) : hi[i] - lo[i]));
  const atr = wilder(tr, 14);
  const bbU: (number | null)[] = [], bbL: (number | null)[] = [];
  for (let i = 0; i < N; i++) {
    if (s20[i] === null) {
      bbU.push(null);
      bbL.push(null);
      continue;
    }
    const w = c.slice(i - 19, i + 1);
    const sd = Math.sqrt(w.reduce((a, v) => a + (v - (s20[i] as number)) ** 2, 0) / 20);
    bbU.push((s20[i] as number) + 2 * sd);
    bbL.push((s20[i] as number) - 2 * sd);
  }
  const pdm = hi.map((v, i) => { if (!i) return null; const up = v - hi[i - 1]; const dn = lo[i - 1] - lo[i]; return up > dn && up > 0 ? up : 0; });
  const ndm = lo.map((v, i) => { if (!i) return null; const up = hi[i] - hi[i - 1]; const dn = lo[i - 1] - v; return dn > up && dn > 0 ? dn : 0; });
  const trw = wilder(tr.map((v, i) => (i ? v : null)), 14, 1), pw = wilder(pdm, 14, 1), nw = wilder(ndm, 14, 1);
  const dx = c.map((_, i) => {
    if (trw[i] === null || !trw[i]) return null;
    const p = (100 * (pw[i] as number)) / (trw[i] as number);
    const n = (100 * (nw[i] as number)) / (trw[i] as number);
    return p + n ? (100 * Math.abs(p - n)) / (p + n) : 0;
  });
  const firstDx = dx.findIndex((v) => v !== null);
  const adx: (number | null)[] = Array(N).fill(null);
  if (firstDx >= 0) wilder(dx.slice(firstDx), 14).forEach((v, j) => (adx[firstDx + j] = v));
  const raw = c.map((v, i) => (i < 13 ? null : hh(hi, i, 14) - ll(lo, i, 14) ? (100 * (v - ll(lo, i, 14))) / (hh(hi, i, 14) - ll(lo, i, 14)) : 50));
  const k = raw.map((_, i) => (i < 15 ? null : ((raw[i] as number) + (raw[i - 1] as number) + (raw[i - 2] as number)) / 3));
  const d = k.map((_, i) => (i < 17 || k[i - 2] === null ? null : ((k[i] as number) + (k[i - 1] as number) + (k[i - 2] as number)) / 3));
  const tenkan = c.map((_, i) => (i < 8 ? null : (hh(hi, i, 9) + ll(lo, i, 9)) / 2));
  const kijun = c.map((_, i) => (i < 25 ? null : (hh(hi, i, 26) + ll(lo, i, 26)) / 2));
  const lead1 = c.map((_, i) => (i < 51 || tenkan[i - 26] === null || kijun[i - 26] === null ? null : ((tenkan[i - 26] as number) + (kijun[i - 26] as number)) / 2));
  const lead2 = c.map((_, i) => (i < 77 ? null : (hh(hi, i - 26, 52) + ll(lo, i - 26, 52)) / 2));
  const monthKey = (t: number) => { const x = new Date(t * 1000); return x.getUTCFullYear() * 12 + x.getUTCMonth(); };
  const months = new Map<number, { h: number; l: number; c: number }>();
  bars.forEach((b) => { const m = monthKey(b[0]); const v = months.get(m) ?? { h: -Infinity, l: Infinity, c: 0 }; v.h = Math.max(v.h, b[2]); v.l = Math.min(v.l, b[3]); v.c = b[4]; months.set(m, v); });
  const pivotOf = (t: number) => {
    const pm = months.get(monthKey(t) - 1);
    if (!pm) return null;
    const P = (pm.h + pm.l + pm.c) / 3;
    const R = pm.h - pm.l;
    return { cR1: 2 * P - pm.l, cS1: 2 * P - pm.h, fR1: P + 0.382 * R, fS1: P - 0.382 * R };
  };
  return bars.map((b, i) => {
    const body = Math.abs(c[i] - o[i]);
    const realRange = hi[i] - lo[i];
    const range = realRange || 1e-9;
    const upper = hi[i] - Math.max(c[i], o[i]);
    const lower = Math.min(c[i], o[i]) - lo[i];
    const prevBear = i > 0 && c[i - 1] < o[i - 1];
    const prevBull = i > 0 && c[i - 1] > o[i - 1];
    const pv = pivotOf(b[0]);
    return {
      time: b[0], open: o[i], high: hi[i], low: lo[i], close: c[i],
      EMA20: e20[i], EMA50: e50[i], EMA200: e200[i], SMA20: s20[i], RSI: rsi[i], "RSI[1]": i ? rsi[i - 1] : null,
      "MACD.macd": macd[i], "MACD.signal": sig[i], ATR: atr[i], "BB.upper": bbU[i], "BB.lower": bbL[i], ADX: adx[i],
      "Stoch.K": k[i], "Stoch.D": d[i], "Ichimoku.CLine": tenkan[i], "Ichimoku.BLine": kijun[i], "Ichimoku.Lead1": lead1[i], "Ichimoku.Lead2": lead2[i],
      "Pivot.M.Classic.R1": pv?.cR1 ?? null, "Pivot.M.Classic.S1": pv?.cS1 ?? null, "Pivot.M.Fibonacci.R1": pv?.fR1 ?? null, "Pivot.M.Fibonacci.S1": pv?.fS1 ?? null,
      "Candle.Engulfing.Bullish": prevBear && c[i] > o[i] && o[i] <= c[i - 1] && c[i] >= o[i - 1] ? 1 : 0,
      "Candle.Engulfing.Bearish": prevBull && c[i] < o[i] && o[i] >= c[i - 1] && c[i] <= o[i - 1] ? 1 : 0,
      // شمعة بدون مدى (سعر ثابت) ليست مطرقة ولا شهاباً
      "Candle.Hammer": realRange > 0 && body <= range / 3 && lower >= 2 * body && upper <= range * 0.15 ? 1 : 0,
      "Candle.ShootingStar": realRange > 0 && body <= range / 3 && upper >= 2 * body && lower <= range * 0.15 ? 1 : 0,
    } as Row;
  });
}

const gt = (a: number | null | undefined, b: number | null | undefined) => a !== null && a !== undefined && b !== null && b !== undefined && a > b;
const lt = (a: number | null | undefined, b: number | null | undefined) => gt(b, a);
const le = (a: number | null | undefined, b: number | null | undefined) => a !== null && a !== undefined && b !== null && b !== undefined && a <= b;
const ge = (a: number | null | undefined, b: number | null | undefined) => le(b, a);

export type StrategyId = "trend" | "rsi" | "macd" | "breakout" | "bollinger" | "ichimoku" | "candles" | "fibpivot" | "pullback";
export type Timeframe = "15min" | "1h" | "4h";
export const TF_MS: Record<Timeframe, number> = { "15min": 15 * 60_000, "1h": 3600_000, "4h": 4 * 3600_000 };
export const TF_LABEL: Record<Timeframe, string> = { "15min": "15 دقيقة", "1h": "ساعة", "4h": "4 ساعات" };

export const STRATEGIES: Record<StrategyId, { name: string; tf: Timeframe; desc: string; rule: (c: Row, p?: Row) => Dir | null }> = {
  trend: {
    name: "📈 تقاطع الاتجاه", tf: "1h", desc: "المتوسط 20 يقطع المتوسط 50 بنفس اتجاه المتوسط 200، مع قوة اتجاه (ADX فوق 18)",
    rule: (c, p) => {
      if (!p || !gt(c.ADX, 18)) return null;
      if (le(p.EMA20, p.EMA50) && gt(c.EMA20, c.EMA50) && gt(c.close, c.EMA200)) return "buy";
      if (ge(p.EMA20, p.EMA50) && lt(c.EMA20, c.EMA50) && lt(c.close, c.EMA200)) return "sell";
      return null;
    },
  },
  rsi: {
    name: "🔄 ارتداد RSI", tf: "15min", desc: "RSI يخرج من منطقة التشبع البيعي (تحت 30) أو ينزل من التشبع الشرائي (فوق 70)",
    rule: (c) => {
      const prev = c["RSI[1]"];
      if (prev === null || prev === undefined || c.RSI === null) return null;
      if (prev < 30 && (c.RSI as number) >= 30) return "buy";
      if (prev > 70 && (c.RSI as number) <= 70) return "sell";
      return null;
    },
  },
  macd: {
    name: "⚡ زخم MACD", tf: "4h", desc: "MACD يقطع خط الإشارة بنفس اتجاه المتوسط 200، وStochastic غير متشبع",
    rule: (c, p) => {
      if (!p) return null;
      if (le(p["MACD.macd"], p["MACD.signal"]) && gt(c["MACD.macd"], c["MACD.signal"]) && gt(c.close, c.EMA200) && lt(c["Stoch.K"], 80)) return "buy";
      if (ge(p["MACD.macd"], p["MACD.signal"]) && lt(c["MACD.macd"], c["MACD.signal"]) && lt(c.close, c.EMA200) && gt(c["Stoch.K"], 20)) return "sell";
      return null;
    },
  },
  breakout: {
    name: "🚀 اختراق البيفوت", tf: "1h", desc: "الإغلاق يخترق المقاومة R1 أو الدعم S1 الشهري مع ADX فوق 20",
    rule: (c, p) => {
      if (!p || !gt(c.ADX, 20)) return null;
      const r1 = c["Pivot.M.Classic.R1"], s1 = c["Pivot.M.Classic.S1"];
      if (r1 && le(p.close, r1) && gt(c.close, r1)) return "buy";
      if (s1 && ge(p.close, s1) && lt(c.close, s1)) return "sell";
      return null;
    },
  },
  bollinger: {
    name: "🎯 ارتداد البولنجر", tf: "1h", desc: "السعر يخرج خارج حد البولنجر ثم يعود لداخله مع RSI في منطقة متطرفة",
    rule: (c, p) => {
      if (!p || !gt(c["BB.lower"], 0)) return null;
      if (lt(p.close, p["BB.lower"]) && gt(c.close, c["BB.lower"]) && lt(c.RSI, 45)) return "buy";
      if (gt(p.close, p["BB.upper"]) && lt(c.close, c["BB.upper"]) && gt(c.RSI, 55)) return "sell";
      return null;
    },
  },
  ichimoku: {
    name: "☁️ إيشيموكو", tf: "4h", desc: "خط التحويل يقطع خط الأساس، والسعر فوق السحابة للشراء أو تحتها للبيع",
    rule: (c, p) => {
      const t = "Ichimoku.CLine", k = "Ichimoku.BLine";
      if (!p || !gt(c[t], 0) || !gt(c[k], 0) || !gt(c["Ichimoku.Lead1"], 0) || !gt(c["Ichimoku.Lead2"], 0)) return null;
      const top = Math.max(c["Ichimoku.Lead1"] as number, c["Ichimoku.Lead2"] as number);
      const bottom = Math.min(c["Ichimoku.Lead1"] as number, c["Ichimoku.Lead2"] as number);
      if (le(p[t], p[k]) && gt(c[t], c[k]) && c.close > top) return "buy";
      if (ge(p[t], p[k]) && lt(c[t], c[k]) && c.close < bottom) return "sell";
      return null;
    },
  },
  candles: {
    name: "🕯 نماذج الشموع", tf: "1h", desc: "ابتلاع أو مطرقة/شهاب عند منطقة تشبع (RSI) وتحت أو فوق المتوسط 20: انعكاس محتمل",
    rule: (c) => {
      if ((c["Candle.Engulfing.Bullish"] || c["Candle.Hammer"]) && lt(c.RSI, 42) && le(c.close, c.SMA20)) return "buy";
      if ((c["Candle.Engulfing.Bearish"] || c["Candle.ShootingStar"]) && gt(c.RSI, 58) && ge(c.close, c.SMA20)) return "sell";
      return null;
    },
  },
  fibpivot: {
    name: "🌀 بيفوت فيبوناتشي", tf: "1h", desc: "ارتداد من دعم فيبوناتشي S1 أو رفض من مقاومة R1 الشهرية بسوق عرضي (ADX تحت 25)",
    rule: (c, p) => {
      const r1 = c["Pivot.M.Fibonacci.R1"], s1 = c["Pivot.M.Fibonacci.S1"];
      if (!p || !lt(c.ADX, 25) || !r1 || !s1) return null;
      if (le(p.close, s1) && gt(c.close, s1)) return "buy";
      if (ge(p.close, r1) && lt(c.close, r1)) return "sell";
      return null;
    },
  },
  pullback: {
    name: "↩️ ارتداد مع الاتجاه", tf: "1h", desc: "الاتجاه صاعد (المتوسط 50 فوق 200) والستوكاستك يخرج من التشبع البيعي، أو العكس للبيع",
    rule: (c, p) => {
      if (!p) return null;
      if (gt(c.EMA50, c.EMA200) && gt(c.close, c.EMA200) && lt(p["Stoch.K"], 20) && ge(c["Stoch.K"], 20)) return "buy";
      if (lt(c.EMA50, c.EMA200) && lt(c.close, c.EMA200) && gt(p["Stoch.K"], 80) && le(c["Stoch.K"], 80)) return "sell";
      return null;
    },
  },
};
export const STRATEGY_IDS = Object.keys(STRATEGIES) as StrategyId[];

export const SESSIONS: Record<string, [string, number, number]> = {
  all: ["كل الأوقات", 0, 24],
  asia: ["آسيا", 0, 8],
  london: ["لندن", 7, 16],
  ny: ["نيويورك", 12, 21],
  overlap: ["تداخل لندن ونيويورك", 12, 16],
};
export const STOP_MODES = { atr: "مضاعف ATR", swing: "خلف البولنجر", pips: "نقاط ثابتة" } as const;

export interface StrategyRisk {
  stop: keyof typeof STOP_MODES;
  atr_mult: number;
  fixed_pips: number;
  tp1_r: number;
  tp2_r: number;
}

export function inSession(session: string, ms: number) {
  const s = SESSIONS[session] ?? SESSIONS.all;
  const hr = new Date(ms).getUTCHours();
  return hr >= s[1] && hr < s[2];
}

/** عملات الرمز لفلتر الأخبار: XAUUSD ← USD، EURUSD ← EUR و USD */
export function currenciesOf(symbol: string): string[] {
  const t = symbol.toUpperCase();
  const found = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"].filter((x) => t.includes(x));
  return found.length ? found : ["USD"];
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
export const priceDecimals = (price: number) => (price >= 1000 ? 2 : price >= 50 ? 3 : 5);

function riskOf(symbol: string, dir: Dir, c: Row, cfg: StrategyRisk) {
  const entry = c.close;
  const atr = (c.ATR as number) > 0 ? (c.ATR as number) : entry * 0.002;
  if (cfg.stop === "pips") return cfg.fixed_pips * pipSize(symbol);
  if (cfg.stop === "swing") {
    const lvl = dir === "buy" ? (c["BB.lower"] as number) - atr * 0.5 : (c["BB.upper"] as number) + atr * 0.5;
    const r = Math.abs(entry - lvl);
    if (lvl > 0 && r >= atr * 0.5 && r <= atr * 4) return r;
  }
  return atr * cfg.atr_mult;
}

/** مستويات الإشارة: الدخول عند إغلاق الشمعة، الوقف حسب المخاطرة، وهدفان بمضاعف R */
export function buildLevels(symbol: string, dir: Dir, c: Row, cfg: StrategyRisk) {
  const entry = c.close;
  const risk = riskOf(symbol, dir, c, cfg);
  const d = priceDecimals(entry);
  const sgn = dir === "buy" ? 1 : -1;
  return {
    entry: round(entry, d),
    sl: round(entry - sgn * risk, d),
    tp1: round(entry + sgn * risk * cfg.tp1_r, d),
    tp2: round(entry + sgn * risk * cfg.tp2_r, d),
    risk_pips: round(risk / pipSize(symbol), 1),
  };
}

export const EXPIRE_BARS = 48;

export interface BacktestTrade {
  dir: Dir;
  entry: number;
  exit: number;
  result: "tp2" | "be" | "sl" | "expired";
  pips: number;
  at: number;
  closedAt: number;
}

export interface BacktestResult {
  strategy: StrategyId;
  symbol: string;
  tf: Timeframe;
  bars: number;
  from: number | null;
  to: number | null;
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  pips: number;
  profitFactor: number | null;
  maxDrawdown: number;
  curve: { t: number; pips: number }[];
  last: BacktestTrade[];
}

/**
 * اختبار على التاريخ: نفس قواعد التشغيل الحي. الهدف الأول ينقل الوقف للدخول، الهدف الثاني أو الوقف يغلقان،
 * وإذا الوقف والهدف بنفس الشمعة تُحسب وقفاً (احتياطاً). الإشارة تنتهي بعد 48 شمعة.
 */
export function simulate(
  id: StrategyId,
  bars: Bar[],
  cfg: StrategyRisk & { session: string; confirm?: string | null; tf: Timeframe },
  symbol: string,
): BacktestResult {
  const strat = STRATEGIES[id];
  if (!strat) throw new Error("الاستراتيجية غير موجودة");
  const rows = computeRows(bars);
  const trades: (BacktestTrade & { tp1: number; sl: number; tp1Hit?: boolean; i: number; tp2: number })[] = [];
  let open: (typeof trades)[number] | null = null;
  const ps = pipSize(symbol);
  const close = (t: NonNullable<typeof open>, exit: number, result: BacktestTrade["result"], j: number) => {
    t.exit = exit;
    t.result = result;
    t.closedAt = bars[j][0];
    t.pips = round((t.dir === "buy" ? exit - t.entry : t.entry - exit) / ps, 1);
    trades.push(t);
    open = null;
  };
  for (let i = 210; i < rows.length; i++) {
    const c = rows[i];
    if (open) {
      const t: NonNullable<typeof open> = open;
      const up = t.dir === "buy";
      const hitSl = up ? c.low <= t.sl : c.high >= t.sl;
      const hitTp1 = up ? c.high >= t.tp1 : c.low <= t.tp1;
      const hitTp2 = up ? c.high >= t.tp2 : c.low <= t.tp2;
      if (hitSl) close(t, t.sl, t.tp1Hit ? "be" : "sl", i);
      else if (hitTp2) close(t, t.tp2, "tp2", i);
      else if (hitTp1 && !t.tp1Hit) {
        t.tp1Hit = true;
        t.sl = t.entry;
      } else if (i - t.i >= EXPIRE_BARS) close(t, c.close, "expired", i);
      if (open) continue;
    }
    if (!inSession(cfg.session, c.time * 1000)) continue;
    const dir = strat.rule(c, rows[i - 1]);
    if (!dir) continue;
    if (cfg.confirm && STRATEGIES[cfg.confirm as StrategyId]?.rule(c, rows[i - 1]) !== dir) continue;
    const lv = buildLevels(symbol, dir, c, cfg);
    open = { dir, entry: lv.entry, sl: lv.sl, tp1: lv.tp1, tp2: lv.tp2, at: c.time, i, exit: 0, result: "expired", pips: 0, closedAt: 0 };
  }
  for (const t of trades) if (t.result === "be") t.pips = round(Math.abs(t.tp1 - t.entry) / ps, 1);
  const wins = trades.filter((t) => t.pips > 0);
  const gross = wins.reduce((a, t) => a + t.pips, 0);
  const lossSum = Math.abs(trades.filter((t) => t.pips < 0).reduce((a, t) => a + t.pips, 0));
  let eq = 0, peak = 0, dd = 0;
  const curve = trades.map((t) => {
    eq = round(eq + t.pips, 1);
    peak = Math.max(peak, eq);
    dd = Math.max(dd, peak - eq);
    return { t: t.closedAt, pips: eq };
  });
  return {
    strategy: id, symbol, tf: cfg.tf, bars: bars.length, from: bars[0]?.[0] ?? null, to: bars.at(-1)?.[0] ?? null,
    trades: trades.length, wins: wins.length, losses: trades.filter((t) => t.pips < 0).length,
    winRate: trades.length ? Math.round((wins.length / trades.length) * 100) : null, pips: round(eq, 1),
    profitFactor: lossSum ? round(gross / lossSum, 2) : gross ? null : 0, maxDrawdown: round(dd, 1),
    curve: curve.slice(-300),
    last: trades.slice(-15).reverse().map(({ dir, entry, exit, result, pips, at, closedAt }) => ({ dir, entry, exit, result, pips, at, closedAt })),
  };
}

/** شموع توضيحية (مسار عشوائي ثابت) — للمعاينة والاختبارات فقط */
export function demoBars(symbol: string, count: number, tfMs: number, base = symbol.startsWith("XAU") ? 2600 : 1.08): Bar[] {
  let seed = [...symbol].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const end = Math.floor(Date.now() / tfMs) * tfMs;
  let price = base;
  let drift = 0;
  const out: Bar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    if (i % 60 === 0) drift = (rand() - 0.5) * 0.0012;
    const vol = base * 0.0022;
    const o = price;
    const c = o + (rand() - 0.5 + drift * 300) * vol;
    out.push([(end - i * tfMs) / 1000, o, Math.max(o, c) + rand() * vol * 0.6, Math.min(o, c) - rand() * vol * 0.6, c]);
    price = c;
  }
  return out;
}
