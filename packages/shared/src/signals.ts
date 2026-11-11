import type { AssetClass, Direction, SignalInput } from "./types";

/** يحدد فئة الأصل تلقائياً من رمز الأداة */
export function detectAssetClass(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (/^(XAU|XAG|GOLD|SILVER)/.test(s)) return "gold";
  if (/(WTI|BRENT|USOIL|UKOIL|XTI|XBR|OIL)/.test(s)) return "oil";
  if (/(US30|NAS100|NDX|SPX|US500|GER40|DE40|UK100|JP225|DJI|US100)/.test(s)) return "indices";
  if (/(BTC|ETH|SOL|XRP|LTC|DOGE)/.test(s)) return "crypto";
  return "forex";
}

/** حجم النقطة (pip) حسب نوع الأداة */
export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  const asset = detectAssetClass(s);
  if (asset === "gold") return s.startsWith("XAG") || s.startsWith("SILVER") ? 0.01 : 0.1;
  if (asset === "oil") return 0.01;
  if (asset === "indices" || asset === "crypto") return 1;
  if (s.includes("JPY")) return 0.01;
  return 0.0001;
}

/** يحسب النقاط المحققة لصفقة عند سعر خروج معين (موجبة = ربح) */
export function calcPips(symbol: string, direction: Direction, entry: number, exit: number): number {
  const diff = direction === "BUY" ? exit - entry : entry - exit;
  return Math.round((diff / pipSize(symbol)) * 10) / 10;
}

/** نسبة العائد إلى المخاطرة بالنسبة للهدف الأول */
export function riskReward(input: Pick<SignalInput, "entry_price" | "stop_loss" | "take_profit_1">): number | null {
  const risk = Math.abs(input.entry_price - input.stop_loss);
  if (risk === 0) return null;
  return Math.round((Math.abs(input.take_profit_1 - input.entry_price) / risk) * 100) / 100;
}

export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** يتحقق من منطقية التوصية ويعيد قائمة بالأخطاء (فارغة = صالحة) */
export function validateSignalInput(input: Partial<SignalInput>): string[] {
  const errors: string[] = [];
  const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

  if (!input.symbol || normalizeSymbol(input.symbol).length < 3) errors.push("رمز الأداة غير صالح");
  if (input.direction !== "BUY" && input.direction !== "SELL") errors.push("الاتجاه يجب أن يكون BUY أو SELL");
  if (!isNum(input.entry_price)) errors.push("سعر الدخول مطلوب");
  if (!isNum(input.stop_loss)) errors.push("وقف الخسارة مطلوب");
  if (!isNum(input.take_profit_1)) errors.push("الهدف الأول مطلوب");
  if (errors.length) return errors;

  const { direction, entry_price: e, stop_loss: sl } = input as SignalInput;
  const tps = [input.take_profit_1, input.take_profit_2, input.take_profit_3].filter(isNum);

  if (direction === "BUY") {
    if (sl >= e) errors.push("في صفقة الشراء يجب أن يكون الوقف أقل من سعر الدخول");
    if (tps.some((tp) => tp <= e)) errors.push("في صفقة الشراء يجب أن تكون الأهداف أعلى من سعر الدخول");
  } else {
    if (sl <= e) errors.push("في صفقة البيع يجب أن يكون الوقف أعلى من سعر الدخول");
    if (tps.some((tp) => tp >= e)) errors.push("في صفقة البيع يجب أن تكون الأهداف أقل من سعر الدخول");
  }
  return errors;
}
