import "server-only";

export interface Candle {
  time: number; // UTC seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketSymbol {
  symbol: string; // كما يظهر في الموقع
  provider: string; // رمز Twelve Data
  name: string;
  base: number; // سعر مرجعي للبيانات التوضيحية فقط
  digits: number;
}

export const MARKET_SYMBOLS: MarketSymbol[] = [
  { symbol: "XAUUSD", provider: "XAU/USD", name: "الذهب / دولار", base: 2650, digits: 2 },
  { symbol: "EURUSD", provider: "EUR/USD", name: "يورو / دولار", base: 1.08, digits: 5 },
  { symbol: "GBPUSD", provider: "GBP/USD", name: "إسترليني / دولار", base: 1.27, digits: 5 },
  { symbol: "USDJPY", provider: "USD/JPY", name: "دولار / ين", base: 152, digits: 3 },
  { symbol: "AUDUSD", provider: "AUD/USD", name: "أسترالي / دولار", base: 0.66, digits: 5 },
  { symbol: "BTCUSD", provider: "BTC/USD", name: "بيتكوين / دولار", base: 90000, digits: 1 },
];

export interface MarketSeries {
  symbol: MarketSymbol;
  candles: Candle[];
  last: number;
  changePct: number;
}

const HOUR = 3600;

/** شموع توضيحية ثابتة (عشوائية مُبذَّرة) — تُستخدم فقط عند غياب مفتاح API */
function demoCandles(sym: MarketSymbol, count = 150): Candle[] {
  let seed = [...sym.symbol].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const now = Math.floor(Date.now() / 1000 / HOUR) * HOUR;
  const vol = sym.base * 0.0025;
  let price = sym.base;
  const out: Candle[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const open = price;
    const close = open + (rand() - 0.49) * vol;
    const high = Math.max(open, close) + rand() * vol * 0.5;
    const low = Math.min(open, close) - rand() * vol * 0.5;
    out.push({ time: now - i * HOUR, open, high, low, close });
    price = close;
  }
  return out;
}

/** يجلب شموع الساعة من Twelve Data (خطة مجانية: 800 طلب/يوم) مع تخزين مؤقت 15 دقيقة */
async function twelveDataCandles(sym: MarketSymbol, apiKey: string): Promise<Candle[] | null> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.search = new URLSearchParams({
    symbol: sym.provider,
    interval: "1h",
    outputsize: "150",
    timezone: "UTC",
    apikey: apiKey,
  }).toString();
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    const json = (await res.json()) as { status?: string; values?: Record<string, string>[]; message?: string };
    if (json.status !== "ok" || !json.values) {
      console.error(`[market] ${sym.symbol}: ${json.message ?? res.status}`);
      return null;
    }
    return json.values
      .map((v) => ({
        time: Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
      }))
      .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
      .sort((a, b) => a.time - b.time);
  } catch (err) {
    console.error(`[market] ${sym.symbol} fetch failed`, err);
    return null;
  }
}

function toSeries(symbol: MarketSymbol, candles: Candle[]): MarketSeries {
  const last = candles.at(-1)?.close ?? 0;
  // التغير خلال آخر 24 شمعة (يوم تقريباً)
  const ref = candles.at(-25)?.close ?? candles[0]?.close ?? last;
  return { symbol, candles, last, changePct: ref ? ((last - ref) / ref) * 100 : 0 };
}

export async function getMarkets(): Promise<{ series: MarketSeries[]; demo: boolean }> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) return { series: MARKET_SYMBOLS.map((s) => toSeries(s, demoCandles(s))), demo: true };

  const results = await Promise.all(MARKET_SYMBOLS.map((s) => twelveDataCandles(s, apiKey)));
  const series = MARKET_SYMBOLS.flatMap((s, i) => (results[i]?.length ? [toSeries(s, results[i]!)] : []));
  if (!series.length) return { series: MARKET_SYMBOLS.map((s) => toSeries(s, demoCandles(s))), demo: true };
  return { series, demo: false };
}
