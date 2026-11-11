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
