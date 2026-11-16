import "server-only";
import { computeRows, type Bar } from "@qfx/shared";
import { unstable_cache } from "next/cache";
import { MARKETS, marketOf, type MarketMeta } from "@/config/markets";
import {
  binanceCandles, binancePrices, scaleCandles, spotMetal, twelveDataCandles, withLivePrice, yahooCandles, yahooPrices,
  type Candle,
} from "@/lib/price-sources";

export type { Candle };

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

export interface LiveQuote {
  symbol: string;
  last: number;
  change: number;
  changePct: number;
}

const HOUR = 3600;
const COUNT = 500; // ~3 أسابيع من شموع الساعة
/** مدة تخزين الشموع وآخر الأسعار (ثوانٍ) */
export const CANDLES_TTL = 300;
export const PRICES_TTL = 30;

/** شموع توضيحية ثابتة — فقط عند فشل كل المصادر */
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

/** آخر الأسعار الحية لكل الأسواق: طلب واحد لـ Yahoo وطلب لـ Binance وطلبان للمعادن الفورية */
const loadLivePrices = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const yahoo = MARKETS.filter((m) => m.yahoo && !m.spot).map((m) => m.yahoo!);
    const pairs = MARKETS.filter((m) => m.binance).map((m) => m.binance!);
    const spots = MARKETS.filter((m) => m.spot);
    const [y, b, ...s] = await Promise.allSettled([yahooPrices(yahoo), binancePrices(pairs), ...spots.map((m) => spotMetal(m.spot!))]);
    const out: Record<string, number> = {};
    for (const m of MARKETS) {
      const v = m.spot
        ? (() => { const r = s[spots.indexOf(m)]; return r.status === "fulfilled" ? r.value : undefined; })()
        : m.binance
          ? b.status === "fulfilled" ? b.value[m.binance] : undefined
          : y.status === "fulfilled" ? y.value[m.yahoo!] : undefined;
      if (v) out[m.symbol] = v;
    }
    return out; // فشل كامل = {} لمدة 30 ثانية فقط، والشموع المخزنة تبقى تعمل
  },
  ["qfx-live-prices-v1"],
  { revalidate: PRICES_TTL },
);

async function livePrices(): Promise<Record<string, number>> {
  try {
    return await loadLivePrices();
  } catch {
    return {};
  }
}

/** شموع الساعة الحقيقية: Binance للكريبتو، Yahoo للباقي (مع تصحيح المعادن للسعر الفوري)، ثم Twelve Data إن وُجد مفتاح */
const loadCandles = unstable_cache(
  async (symbol: string): Promise<Candle[]> => {
    const m = marketOf(symbol)!;
    const errors: string[] = [];
    if (m.binance) {
      try {
        return await binanceCandles(m.binance, COUNT);
      } catch (e) {
        errors.push(String(e));
      }
    }
    if (m.yahoo) {
      try {
        const { candles, last } = await yahooCandles(m.yahoo);
        if (!m.spot) return candles;
        const spot = await spotMetal(m.spot).catch(() => null);
        const ref = last ?? candles.at(-1)!.close;
        return spot ? scaleCandles(candles, spot / ref) : candles;
      } catch (e) {
        errors.push(String(e));
      }
    }
    const key = process.env.TWELVEDATA_API_KEY;
    if (key) {
      try {
        return await twelveDataCandles(m.provider, key, COUNT);
      } catch (e) {
        errors.push(String(e));
      }
    }
    throw new Error(`no candles for ${symbol}: ${errors.join("; ")}`);
  },
  ["qfx-candles-v1"],
  { revalidate: CANDLES_TTL },
);

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

export async function getSeries(symbol: string, prices?: Record<string, number>): Promise<MarketSeries | null> {
  const meta = marketOf(symbol);
  if (!meta) return null;
  const real = await loadCandles(meta.symbol).catch((e) => {
    console.warn("[market-data]", String(e));
    return null;
  });
  if (!real?.length) return toSeries(meta, demoCandles(meta), true);
  const live = (prices ?? (await livePrices()))[meta.symbol];
  return toSeries(meta, withLivePrice(real, live), false);
}

export async function getMarkets(symbols: string[] = MARKETS.map((m) => m.symbol)): Promise<{ series: MarketSeries[]; demo: boolean }> {
  const prices = await livePrices();
  const series = (await Promise.all(symbols.map((s) => getSeries(s, prices)))).filter(Boolean) as MarketSeries[];
  return { series, demo: series.some((s) => s.demo) };
}

/** آخر سعر وتغيّر 24 ساعة لكل الأسواق (لتحديث الصفحات المفتوحة دون إعادة تحميل) */
export async function getQuotes(): Promise<LiveQuote[]> {
  const { series } = await getMarkets();
  return series.filter((s) => !s.demo).map((s) => ({ symbol: s.meta.symbol, last: s.last, change: s.change, changePct: s.changePct }));
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
