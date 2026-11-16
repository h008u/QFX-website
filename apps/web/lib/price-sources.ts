// مصادر الأسعار الحقيقية (مجانية وبدون مفاتيح) — دوال تحليل نقية قابلة للاختبار + دوال جلب.
//   - Yahoo Finance: العملات والنفط وعقود الذهب/الفضة (شموع الساعة + آخر سعر)
//   - Binance (data-api.binance.vision — بيانات سوق عامة): الكريبتو
//   - gold-api.com: السعر الفوري للذهب والفضة (لتصحيح فرق العقود الآجلة عن الفوري)
// كل دالة جلب ترمي خطأ عند أي رد غير صالح حتى لا يُخزَّن رد فاشل في الكاش.

export interface Candle {
  time: number; // UTC seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

const HOUR = 3600;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; QFX/1.0)", Accept: "application/json" };
const TIMEOUT = 8000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** يدمج نقاطاً بأي توقيت في شموع ساعة كاملة (Yahoo يرسل آخر شمعة بتوقيت غير مقرّب) */
export function toHourly(points: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (const p of [...points].sort((a, b) => a.time - b.time)) {
    const t = Math.floor(p.time / HOUR) * HOUR;
    const last = out.at(-1);
    if (last && last.time === t) {
      last.high = Math.max(last.high, p.high);
      last.low = Math.min(last.low, p.low);
      last.close = p.close;
    } else out.push({ ...p, time: t });
  }
  return out;
}

// ---------- Yahoo ----------
interface YahooChart {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
}

export function parseYahooChart(json: unknown): { candles: Candle[]; last: number | null } {
  const r = (json as YahooChart)?.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0] ?? {};
  const points: Candle[] = [];
  ts.forEach((time, i) => {
    const o = num(q.open?.[i]), h = num(q.high?.[i]), l = num(q.low?.[i]), c = num(q.close?.[i]);
    if (o !== null && h !== null && l !== null && c !== null) points.push({ time, open: o, high: h, low: l, close: c });
  });
  return { candles: toHourly(points), last: num(r?.meta?.regularMarketPrice) };
}

export async function yahooCandles(symbol: string): Promise<{ candles: Candle[]; last: number | null }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=1mo`;
  const parsed = parseYahooChart(await getJson(url));
  if (parsed.candles.length < 50) throw new Error(`yahoo ${symbol}: too few candles`);
  return parsed;
}

interface YahooSpark {
  spark?: { result?: { symbol: string; response?: { meta?: { regularMarketPrice?: number } }[] }[] };
}

export function parseYahooSpark(json: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of (json as YahooSpark)?.spark?.result ?? []) {
    const p = num(r.response?.[0]?.meta?.regularMarketPrice);
    if (p !== null && p > 0) out[r.symbol] = p;
  }
  return out;
}

/** آخر سعر لعدة رموز Yahoo بطلب واحد */
export async function yahooPrices(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {};
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols.map(encodeURIComponent).join(",")}&range=1d&interval=1d`;
  return parseYahooSpark(await getJson(url));
}

// ---------- Binance ----------
export function parseBinanceKlines(json: unknown): Candle[] {
  if (!Array.isArray(json)) return [];
  const out: Candle[] = [];
  for (const k of json) {
    if (!Array.isArray(k)) continue;
    const t = num(k[0]), o = num(k[1]), h = num(k[2]), l = num(k[3]), c = num(k[4]);
    if (t !== null && o !== null && h !== null && l !== null && c !== null) out.push({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c });
  }
  return out;
}

export async function binanceCandles(pair: string, limit = 500): Promise<Candle[]> {
  const candles = parseBinanceKlines(await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1h&limit=${limit}`));
  if (candles.length < 50) throw new Error(`binance ${pair}: too few candles`);
  return candles;
}

export function parseBinancePrices(json: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(json)) return out;
  for (const t of json as { symbol?: string; price?: string }[]) {
    const p = num(t?.price);
    if (t?.symbol && p !== null && p > 0) out[t.symbol] = p;
  }
  return out;
}

export async function binancePrices(pairs: string[]): Promise<Record<string, number>> {
  if (!pairs.length) return {};
  const q = encodeURIComponent(JSON.stringify(pairs));
  return parseBinancePrices(await getJson(`https://data-api.binance.vision/api/v3/ticker/price?symbols=${q}`));
}

// ---------- gold-api.com (السعر الفوري للمعادن) ----------
export function parseGoldApi(json: unknown): number | null {
  const p = num((json as { price?: unknown })?.price);
  return p !== null && p > 0 ? p : null;
}

export async function spotMetal(code: "XAU" | "XAG"): Promise<number> {
  const p = parseGoldApi(await getJson(`https://api.gold-api.com/price/${code}`));
  if (p === null) throw new Error(`gold-api ${code}: no price`);
  return p;
}

// ---------- Twelve Data (احتياطي بمفتاح) ----------
export function parseTwelveData(json: unknown): Candle[] {
  const j = json as { status?: string; values?: Record<string, string>[] };
  if (j?.status !== "ok" || !j.values) return [];
  return j.values
    .map((v) => ({ time: Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000), open: +v.open, high: +v.high, low: +v.low, close: +v.close }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time);
}

export async function twelveDataCandles(symbol: string, key: string, count = 500): Promise<Candle[]> {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=${count}&timezone=UTC&apikey=${key}`;
  const candles = parseTwelveData(await getJson(url));
  if (candles.length < 50) throw new Error(`twelvedata ${symbol}: no data`);
  return candles;
}

// ---------- تصحيحات ----------
/** يضبط شموع العقد الآجل على مستوى السعر الفوري بنسبة ثابتة (الفرق بينهما صغير ومستقر خلال أسابيع) */
export function scaleCandles(candles: Candle[], ratio: number): Candle[] {
  if (!Number.isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) > 0.1) return candles; // نسبة غير منطقية = لا تصحيح
  return candles.map((c) => ({ time: c.time, open: c.open * ratio, high: c.high * ratio, low: c.low * ratio, close: c.close * ratio }));
}

/** يجعل آخر شمعة تنتهي عند السعر الحي (إن كان قريباً منها) */
export function withLivePrice(candles: Candle[], price: number | null | undefined, now = Date.now()): Candle[] {
  const last = candles.at(-1);
  if (!last || !price || !Number.isFinite(price) || Math.abs(price / last.close - 1) > 0.1) return candles;
  const hour = Math.floor(now / 1000 / HOUR) * HOUR;
  if (hour > last.time) {
    // السوق مغلق (عطلة نهاية الأسبوع مثلاً): لا نخترع شمعة جديدة بعد فجوة طويلة
    if (hour - last.time > 2 * HOUR) return candles;
    return [...candles, { time: hour, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price }];
  }
  return [...candles.slice(0, -1), { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price }];
}
