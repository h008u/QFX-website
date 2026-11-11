import { detectAssetClass, normalizeSymbol } from "./signals";
import type { Direction, SignalInput } from "./types";

const DIRECTION_WORDS: Record<string, Direction> = {
  BUY: "BUY",
  LONG: "BUY",
  "شراء": "BUY",
  SELL: "SELL",
  SHORT: "SELL",
  "بيع": "SELL",
};

const toNumber = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  // دعم الأرقام العربية-الهندية مثل ٢٣٥٠٫٥
  const western = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, ".")
    .replace(/^@/, "");
  const n = Number(western);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * يحوّل نص أمر تيليجرام إلى توصية.
 * الصيغة: BUY XAUUSD 2350.5 SL 2340 TP 2360 TP2 2370 TP3 2380 ملاحظات اختيارية
 * يقبل أيضاً: "شراء" / "بيع" ، و "@" قبل سعر الدخول.
 */
export function parseSignalCommand(text: string): { ok: true; value: SignalInput } | { ok: false; error: string } {
  const tokens = text.trim().replace(/^\/signal(@\w+)?\s*/i, "").split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return { ok: false, error: "الصيغة: BUY XAUUSD 2350 SL 2340 TP 2360 [TP2 2370] [TP3 2380] [ملاحظات]" };
  }

  // يسمح بكتابة الاتجاه قبل الرمز أو بعده
  let direction = DIRECTION_WORDS[tokens[0].toUpperCase()];
  let symbol = tokens[1];
  if (!direction) {
    direction = DIRECTION_WORDS[tokens[1].toUpperCase()];
    symbol = tokens[0];
  }
  if (!direction) return { ok: false, error: "حدد الاتجاه BUY أو SELL" };

  const entry = toNumber(tokens[2]);
  if (entry === undefined) return { ok: false, error: "سعر الدخول غير صالح" };

  const out: SignalInput = {
    symbol: normalizeSymbol(symbol),
    direction,
    entry_price: entry,
    stop_loss: NaN,
    take_profit_1: NaN,
    source: "telegram",
  };
  const notes: string[] = [];
  const tps: number[] = [];

  for (let i = 3; i < tokens.length; i++) {
    const key = tokens[i].toUpperCase().replace(/[:=]$/, "");
    const value = toNumber(tokens[i + 1]);
    if ((key === "SL" || key === "STOP") && value !== undefined) {
      out.stop_loss = value;
      i++;
    } else if (/^TP[1-3]?$/.test(key) && value !== undefined) {
      const idx = key.length === 3 ? Number(key[2]) - 1 : tps.length;
      tps[idx] = value;
      i++;
    } else {
      notes.push(tokens[i]);
    }
  }

  out.take_profit_1 = tps[0] ?? NaN;
  out.take_profit_2 = tps[1] ?? null;
  out.take_profit_3 = tps[2] ?? null;
  out.asset_class = detectAssetClass(out.symbol);
  if (notes.length) out.notes = notes.join(" ");

  if (!Number.isFinite(out.stop_loss)) return { ok: false, error: "أضف وقف الخسارة: SL 2340" };
  if (!Number.isFinite(out.take_profit_1)) return { ok: false, error: "أضف هدفاً واحداً على الأقل: TP 2360" };
  return { ok: true, value: out };
}
