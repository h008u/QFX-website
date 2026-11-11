// جسر MT5: يستقبل أحداث إضافة SpirBridge/QFXBridge (ترسل فقط ولا تنفذ صفقات) ويحوّلها لتوصيات تنزل بالقناة
import { calcPips, escapeHtml, type BotSettings, type Signal, type SignalStatus } from "@qfx/shared";
import { createExternalSignal, postSignalNote, updateSignal } from "../services/signals";
import { db } from "../supabase";
import { getState, setState } from "./config";

export interface Mt5Event {
  type: string;
  ticket?: number;
  symbol?: string;
  side?: "buy" | "sell";
  price?: number;
  sl?: number;
  tp?: number;
  volume?: number;
  profit?: number;
  reason?: "sl" | "tp" | "so" | "manual";
  partial?: boolean;
  [k: string]: unknown;
}

export interface Mt5State {
  hello?: { version?: string; build?: number; at: string };
  account?: Record<string, unknown> & { at: string };
  last_event?: { type: string; at: string };
  counts?: Record<string, number>;
}

/** XAUUSDm أو XAUUSD.m أو GOLD# ← XAUUSD (اسم الرمز عند الوسيط يختلف) */
export function baseSymbol(raw: string): string {
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("GOLD")) return "XAUUSD";
  if (s.startsWith("SILVER")) return "XAGUSD";
  const m = s.match(/^([A-Z]{6})/);
  return m && /^(XAU|XAG|EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|BTC|ETH)/.test(m[1]) ? m[1] : s.slice(0, 12);
}

const nz = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

async function byTicket(ticket: number): Promise<Signal | null> {
  const { data } = await db().from("signals").select("*").eq("external_ref", `mt5:${ticket}`).maybeSingle<Signal>();
  return data;
}

export async function handleMt5Event(e: Mt5Event, s: BotSettings): Promise<{ ok: boolean; note?: string }> {
  const st = await getState<Mt5State>("mt5", {});
  st.counts = { ...(st.counts ?? {}), [e.type]: (st.counts?.[e.type] ?? 0) + 1 };
  st.last_event = { type: e.type, at: new Date().toISOString() };
  if (e.type === "hello") st.hello = { version: String(e.version ?? ""), build: Number(e.build) || undefined, at: new Date().toISOString() };
  if (e.type === "account") {
    const { type: _t, ...acc } = e;
    st.account = { ...acc, at: new Date().toISOString() };
  }
  await setState("mt5", st);

  if (!["open", "modify", "close"].includes(e.type)) return { ok: true };
  if (!s.mt5.enabled) return { ok: true, note: "ربط MT5 مطفي من اللوحة" };
  if (!e.ticket || !e.symbol) return { ok: false, note: "ticket/symbol مفقود" };
  const symbol = baseSymbol(e.symbol);
  if (s.mt5.symbols.length && !s.mt5.symbols.some((x) => baseSymbol(x) === symbol)) return { ok: true, note: "رمز خارج القائمة" };

  if (e.type === "open") {
    if (!(Number(e.price) > 0) || (e.side !== "buy" && e.side !== "sell")) return { ok: false, note: "بيانات الصفقة ناقصة" };
    await createExternalSignal(
      {
        symbol,
        direction: e.side === "buy" ? "BUY" : "SELL",
        entry_price: Number(e.price),
        stop_loss: nz(e.sl),
        take_profit_1: nz(e.tp),
        notes: e.volume ? `حجم ${e.volume} لوت — من MT5` : "من MT5",
        source: "mt5",
        external_ref: `mt5:${e.ticket}`,
      },
      s.mt5.publish_open,
    );
    return { ok: true };
  }

  const sig = await byTicket(e.ticket);
  if (!sig) return { ok: true, note: "صفقة غير معروفة (فُتحت قبل الربط)" };

  if (e.type === "modify") {
    const sl = nz(e.sl);
    const tp = nz(e.tp);
    if (Number(sig.stop_loss) === (sl ?? 0) && Number(sig.take_profit_1) === (tp ?? 0)) return { ok: true };
    await db().from("signals").update({ stop_loss: sl, take_profit_1: tp }).eq("id", sig.id);
    if (s.mt5.publish_modify) {
      const lines = [`🔄 <b>تحديث صفقة ${escapeHtml(symbol)}</b>`];
      if (sl !== Number(sig.stop_loss)) lines.push(`🛑 الوقف الجديد: <code>${sl ?? "بدون"}</code>`);
      if (tp !== Number(sig.take_profit_1)) lines.push(`🎯 الهدف الجديد: <code>${tp ?? "بدون"}</code>`);
      if (sl && sl === Number(sig.entry_price)) lines.push("✅ الوقف على نقطة الدخول — الصفقة بدون مخاطرة");
      await postSignalNote(sig, lines.join("\n"));
    }
    return { ok: true };
  }

  // close
  const price = Number(e.price);
  const pips = calcPips(symbol, sig.direction, Number(sig.entry_price), price);
  if (e.partial) {
    if (s.mt5.publish_close) {
      await postSignalNote(sig, `✂️ <b>إغلاق جزئي ${escapeHtml(symbol)}</b>\nعند <code>${price}</code> (${pips > 0 ? "+" : ""}${pips} نقطة)`);
    }
    return { ok: true };
  }
  const status: Exclude<SignalStatus, "pending"> = e.reason === "tp" ? "tp_hit" : e.reason === "sl" ? (pips >= 0 ? "closed" : "sl_hit") : "closed";
  await updateSignal(sig.id, { status, exit_price: price, result_pips: pips }, { publish: s.mt5.publish_close });
  return { ok: true };
}
