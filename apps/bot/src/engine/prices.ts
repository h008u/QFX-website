import { getEnv } from "../env";
import { fetchWithTimeout } from "./fetch";

/** XAUUSD → XAU/USD لـ Twelve Data */
export const providerSymbol = (s: string) => (/^[A-Z]{6}$/.test(s) ? `${s.slice(0, 3)}/${s.slice(3)}` : s);

/** أسعار لحظية من Twelve Data (الخطة المجانية). يرجع خريطة الرمز ← السعر */
export async function getPrices(symbols: string[]): Promise<Map<string, number>> {
  const key = getEnv().twelveDataKey;
  const out = new Map<string, number>();
  const unique = [...new Set(symbols)];
  if (!key) throw new Error("أضف TWELVEDATA_API_KEY لتفعيل الأسعار");
  if (!unique.length) return out;
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(unique.map(providerSymbol).join(","))}&apikey=${key}`;
  const res = await fetchWithTimeout(url);
  const json = (await res.json()) as Record<string, any>;
  if (json.status === "error") throw new Error(json.message ?? "Twelve Data error");
  if (unique.length === 1) {
    const p = Number(json.price);
    if (Number.isFinite(p)) out.set(unique[0], p);
    return out;
  }
  for (const sym of unique) {
    const p = Number(json[providerSymbol(sym)]?.price);
    if (Number.isFinite(p)) out.set(sym, p);
  }
  return out;
}

/** شموع تاريخية من Twelve Data (UTC)، من الأقدم للأحدث: [وقت بالثواني، فتح، أعلى، أدنى، إغلاق] */
export async function getCandles(symbol: string, interval: "15min" | "1h" | "4h", count = 300): Promise<[number, number, number, number, number][]> {
  const key = getEnv().twelveDataKey;
  if (!key) throw new Error("أضف TWELVEDATA_API_KEY لتشغيل بوتات التحليل");
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(providerSymbol(symbol))}&interval=${interval}&outputsize=${count}&timezone=UTC&apikey=${key}`;
  const res = await fetchWithTimeout(url, {}, 20_000);
  const json = (await res.json()) as { status?: string; message?: string; values?: Record<string, string>[] };
  if (json.status !== "ok" || !json.values) throw new Error(json.message ?? `Twelve Data ${res.status}`);
  return json.values
    .map((v) => [Math.floor(Date.parse(`${v.datetime.replace(" ", "T")}Z`) / 1000), Number(v.open), Number(v.high), Number(v.low), Number(v.close)] as [number, number, number, number, number])
    .filter((b) => b.every(Number.isFinite))
    .sort((a, b) => a[0] - b[0]);
}
