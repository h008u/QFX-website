import "server-only";
import { computeRows, type Bar } from "@qfx/shared";
import { MARKETS, marketOf, type MarketMeta } from "@/config/markets";

export interface Candle {
  time: number; // UTC seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketSeries {
  meta: MarketMeta;
  candles: Candle[]; // ساعة
  last: number;
  change: number; // آخر 24 ساعة
  changePct: number;
  high24: number;
  low24: number;
  open24: number;
  demo: boolean;
}

const HOUR = 3600;
const COUNT = 500; // ~3 أسابيع من شموع الساعة

/** شموع توضيحية ثابتة — فقط عند غياب مفتاح API أو فشل المصدر */
function demoCandles(m: MarketMeta, count = COUNT): Candle[] {
  let seed = [...m.symbol].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const now = Math.floor(Date.now() / 1000 / HOUR) * HOUR;
  const vol = m.base * 0.0022;
  let price = m.base;
  let drift = 0;
  const out: Candle[] = [];
  for (let i = count - 1; i >= 0; i--) {
    if (i % 48 === 0) drift = (rand() - 0.5) * 0.35;
    const open = price;
    const close = open + (rand() - 0.5 + drift) * vol;
    out.push({ time: now - i * HOUR, open, high: Math.max(open, close) + rand() * vol * 0.5, low: Math.min(open, close) - rand() * vol * 0.5, close });
    price = close;
  }
  return out;
}

/** شموع الساعة من Twelve Data (الخطة المجانية) مع تخزين 30 دقيقة */
async function fetchCandles(m: MarketMeta, key: string): Promise<Candle[] | null> {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(m.provider)}&interval=1h&outputsize=${COUNT}&timezone=UTC&apikey=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const json = (await res.json()) as { status?: string; values?: Record<string, string>[] };
    if (json.status !== "ok" || !json.values) return null;
    return json.values
      .map((v) => ({ time: Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
      .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
      .sort((a, b) => a.time - b.time);
  } catch {
    return null;
  }
}

function toSeries(meta: MarketMeta, candles: Candle[], demo: boolean): MarketSeries {
  const last = candles.at(-1)?.close ?? 0;
  const day = candles.slice(-24);
  const open24 = day[0]?.open ?? last;
  return {
    meta,
    candles,
    last,
    change: last - open24,
    changePct: open24 ? ((last - open24) / open24) * 100 : 0,
    high24: Math.max(...day.map((c) => c.high)),
    low24: Math.min(...day.map((c) => c.low)),
    open24,
    demo,
  };
}

export async function getSeries(symbol: string): Promise<MarketSeries | null> {
  const meta = marketOf(symbol);
  if (!meta) return null;
  const key = process.env.TWELVEDATA_API_KEY;
  const real = key ? await fetchCandles(meta, key) : null;
  return real?.length ? toSeries(meta, real, false) : toSeries(meta, demoCandles(meta), true);
}

export async function getMarkets(symbols: string[] = MARKETS.map((m) => m.symbol)): Promise<{ series: MarketSeries[]; demo: boolean }> {
  const series = (await Promise.all(symbols.map(getSeries))).filter(Boolean) as MarketSeries[];
  return { series, demo: series.some((s) => s.demo) };
}

/** تجميع شموع الساعة لإطار أكبر (4 ساعات أو يوم) */
export function aggregate(candles: Candle[], hours: number): Candle[] {
  const size = hours * HOUR;
  const out: Candle[] = [];
  for (const c of candles) {
    const t = Math.floor(c.time / size) * size;
    const last = out.at(-1);
    if (last && last.time === t) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
    } else out.push({ ...c, time: t });
  }
  return out;
}

export type Rating = "strong_sell" | "sell" | "neutral" | "buy" | "strong_buy";

export interface Technicals {
  summary: { value: number; rating: Rating };
  ma: { value: number; rating: Rating; buy: number; sell: number; neutral: number; rows: { name: string; value: number | null; action: "buy" | "sell" | "neutral" }[] };
  osc: { value: number; rating: Rating; buy: number; sell: number; neutral: number; rows: { name: string; value: number | null; action: "buy" | "sell" | "neutral" }[] };
}

const ratingOf = (v: number): Rating => (v <= -0.5 ? "strong_sell" : v < -0.1 ? "sell" : v <= 0.1 ? "neutral" : v < 0.5 ? "buy" : "strong_buy");

/** ملخص فني بنفس فكرة صفحة Technicals: تصويت المتوسطات والمذبذبات */
export function technicals(candles: Candle[]): Technicals {
  const rows = computeRows(candles.map((c) => [c.time, c.open, c.high, c.low, c.close] as Bar));
  const c = rows.at(-1)!;
  const p = rows.at(-2)!;
  const ma = (["EMA20", "SMA20", "EMA50", "EMA200"] as const).map((k) => {
    const v = c[k] as number | null;
    return { name: k.replace("EMA", "EMA ").replace("SMA", "SMA "), value: v, action: v === null ? ("neutral" as const) : c.close > v ? ("buy" as const) : ("sell" as const) };
  });
  const rsi = c.RSI as number | null;
  const stoch = c["Stoch.K"] as number | null;
  const macd = c["MACD.macd"] as number | null;
  const sig = c["MACD.signal"] as number | null;
  const adx = c.ADX as number | null;
  const osc = [
    { name: "RSI (14)", value: rsi, action: rsi === null ? "neutral" : rsi < 30 ? "buy" : rsi > 70 ? "sell" : "neutral" },
    { name: "Stochastic %K", value: stoch, action: stoch === null ? "neutral" : stoch < 20 ? "buy" : stoch > 80 ? "sell" : "neutral" },
    { name: "MACD (12, 26)", value: macd, action: macd === null || sig === null ? "neutral" : macd > sig ? "buy" : "sell" },
    { name: "ADX (14)", value: adx, action: adx === null || adx < 20 ? "neutral" : (c.EMA20 as number) > (p.EMA20 as number) ? "buy" : "sell" },
  ] as Technicals["osc"]["rows"];
  const vote = (list: { action: string }[]) => {
    const buy = list.filter((x) => x.action === "buy").length;
    const sell = list.filter((x) => x.action === "sell").length;
    const value = (buy - sell) / list.length;
    return { value, rating: ratingOf(value), buy, sell, neutral: list.length - buy - sell };
  };
  const m = vote(ma);
  const o = vote(osc);
  const sum = (m.value + o.value) / 2;
  return { summary: { value: sum, rating: ratingOf(sum) }, ma: { ...m, rows: ma }, osc: { ...o, rows: osc } };
}
