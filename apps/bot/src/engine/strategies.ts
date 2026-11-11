// بوتات التحليل (التشغيل الحي): بعد إغلاق كل شمعة تُفحص الاستراتيجيات المفعّلة، والإشارة تُتابع حتى الهدف أو الوقف
import {
  buildLevels, calcPips, computeRows, currenciesOf, escapeHtml, inSession, localParts, STRATEGIES, TF_LABEL, TF_MS,
  type Bar, type BotSettings, type Signal, type StrategyConfig, type StrategyId, type Timeframe,
} from "@qfx/shared";
import { createExternalSignal, postSignalNote, updateSignal } from "../services/signals";
import { db } from "../supabase";
import { getState, setState } from "./config";
import { renderChartPng } from "./chart";
import { uploadImage } from "./media";
import { getCandles, getPrices } from "./prices";
import { EXPIRE_BARS } from "@qfx/shared";

interface StratState {
  last: Record<string, number>; // symbol|tf ← وقت آخر شمعة مغلقة تم فحصها
  skipped: { at: string; strategy: string; symbol: string; dir: string; reason: string }[];
}

type CandleSource = (symbol: string, tf: Timeframe) => Promise<Bar[]>;

/** يحذف الشمعة الجارية (لم تُغلق بعد) */
export const closedBars = (bars: Bar[], tf: Timeframe, nowMs: number) => bars.filter((b) => b[0] * 1000 + TF_MS[tf] <= nowMs);

async function newsNear(symbol: string, atMs: number, minutes: number) {
  if (!minutes) return null;
  const { data } = await db()
    .from("news")
    .select("title, currency, event_time")
    .eq("kind", "calendar")
    .eq("impact", "high")
    .in("currency", currenciesOf(symbol))
    .gte("event_time", new Date(atMs - minutes * 60_000).toISOString())
    .lte("event_time", new Date(atMs + minutes * 60_000).toISOString())
    .limit(1);
  return data?.[0] ?? null;
}

async function countToday(id: string, tz: string, now: Date) {
  const today = localParts(now, tz).date;
  const { data } = await db().from("signals").select("created_at").eq("strategy", id).gte("created_at", new Date(now.getTime() - 36 * 3600_000).toISOString());
  return (data ?? []).filter((r) => localParts(new Date(r.created_at), tz).date === today).length;
}

/** يفحص الاستراتيجيات على الشموع المغلقة الجديدة */
export async function runStrategies(s: BotSettings, now = new Date(), opts: { force?: boolean; candles?: CandleSource } = {}) {
  if (!s.strategies.enabled && !opts.force) return { skipped: "disabled" };
  const fetchBars: CandleSource = opts.candles ?? ((sym, tf) => getCandles(sym, tf, 300));
  const st = await getState<StratState>("strategies", { last: {}, skipped: [] });
  const enabled = s.strategies.list.filter((c) => c.enabled && STRATEGIES[c.id as StrategyId]);
  const tfs = [...new Set(enabled.map((c) => c.tf))];
  const created: string[] = [];
  const skipped: StratState["skipped"] = [];
  const errors: string[] = [];

  for (const symbol of s.strategies.symbols) {
    for (const tf of tfs) {
      const key = `${symbol}|${tf}`;
      const last = st.last[key] ?? 0;
      // لا نطلب الشموع قبل أن تُغلق شمعة جديدة (توفير لحدود الخطة المجانية)
      if (!opts.force && last && now.getTime() < (last + 2 * (TF_MS[tf] / 1000)) * 1000) continue;
      let bars: Bar[];
      try {
        bars = closedBars(await fetchBars(symbol, tf), tf, now.getTime());
      } catch (e) {
        errors.push(`${key}: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      if (bars.length < 220) {
        errors.push(`${key}: شموع غير كافية (${bars.length})`);
        continue;
      }
      const rows = computeRows(bars);
      const c = rows.at(-1)!;
      const p = rows.at(-2)!;
      if (!opts.force && c.time <= last) continue;
      st.last[key] = c.time;

      for (const cfg of enabled.filter((x) => x.tf === tf)) {
        const strat = STRATEGIES[cfg.id as StrategyId];
        const dir = strat.rule(c, p);
        if (!dir) continue;
        const skip = (reason: string) => skipped.push({ at: now.toISOString(), strategy: cfg.id, symbol, dir, reason });
        if (!inSession(cfg.session, c.time * 1000)) { skip("خارج الجلسة"); continue; }
        if (cfg.confirm && STRATEGIES[cfg.confirm as StrategyId]?.rule(c, p) !== dir) { skip(`لم تؤكدها ${STRATEGIES[cfg.confirm as StrategyId]?.name ?? cfg.confirm}`); continue; }
        const near = await newsNear(symbol, now.getTime(), cfg.avoid_news_min);
        if (near) { skip(`قرب خبر قوي: ${near.title}`); continue; }
        const { data: openSame } = await db().from("signals").select("id").eq("strategy", cfg.id).eq("symbol", symbol).in("status", ["open", "pending"]).limit(1);
        if (openSame?.length) { skip("توجد إشارة مفتوحة لنفس الاستراتيجية والرمز"); continue; }
        if ((await countToday(cfg.id, s.general.timezone, now)) >= cfg.max_per_day) { skip("وصلت الحد اليومي"); continue; }

        const lv = buildLevels(symbol, dir, c, cfg);
        // صورة الشارت مع مستويات الإشارة (إذا فشلت تنزل الإشارة بدون صورة)
        let photo: string | null = null;
        if (cfg.publish && !opts.candles) {
          try {
            const png = renderChartPng({
              symbol,
              tfLabel: tf.toUpperCase(),
              bars,
              lines: [
                { price: lv.entry, label: `${dir === "buy" ? "BUY" : "SELL"} Entry`, kind: "entry" },
                { price: lv.sl, label: "SL", kind: "sl" },
                { price: lv.tp1, label: "TP1", kind: "tp" },
                { price: lv.tp2, label: "TP2", kind: "tp" },
              ],
            });
            photo = await uploadImage(`charts/${cfg.id}-${symbol}-${c.time}.png`, png);
          } catch (e) {
            console.error("[strategies] chart", e instanceof Error ? e.message : e);
          }
        }
        const sig = await createExternalSignal(
          {
            symbol,
            direction: dir === "buy" ? "BUY" : "SELL",
            entry_price: lv.entry,
            stop_loss: lv.sl,
            take_profit_1: lv.tp1,
            take_profit_2: lv.tp2,
            notes: `${strat.desc} • إطار ${TF_LABEL[tf]} • المخاطرة ${lv.risk_pips} نقطة`,
            source: "strategy",
            external_ref: `strat:${cfg.id}:${symbol}:${c.time}`,
            strategy: strat.name,
            meta: { strategy_id: cfg.id, tf, tp1_hit: false, bar_time: c.time },
          },
          cfg.publish,
          photo,
        );
        if (sig) created.push(`${cfg.id} ${dir} ${symbol}`);
      }
    }
  }
  st.skipped = [...skipped, ...st.skipped].slice(0, 40);
  await setState("strategies", st);
  if (errors.length && !created.length && errors.length === s.strategies.symbols.length * tfs.length) throw new Error(errors.join(" | "));
  return { created, skipped: skipped.length, errors };
}

interface StratSignal extends Signal {
  meta: { strategy_id: StrategyId; tf: Timeframe; tp1_hit: boolean; bar_time: number } | null;
  take_profit_2: number | null;
}

/**
 * متابعة إشارات الاستراتيجيات: الهدف الأول ← الوقف للدخول (ورسالة)، الهدف الثاني ← إغلاق رابح،
 * الوقف ← خسارة (أو تعادل بعد الهدف الأول)، وانتهاء بعد 48 شمعة بسعر السوق.
 */
export async function trackStrategySignals(s: BotSettings, now = new Date(), priceOf?: Map<string, number>) {
  const { data } = await db().from("signals").select("*").eq("source", "strategy").in("status", ["open", "pending"]).limit(100);
  const open = (data ?? []) as StratSignal[];
  if (!open.length) return { tracked: 0 };
  const prices = priceOf ?? (await getPrices([...new Set(open.map((x) => x.symbol))]));
  const events: string[] = [];
  for (const sig of open) {
    const price = prices.get(sig.symbol);
    if (!(price && price > 0) || !sig.meta) continue;
    const up = sig.direction === "BUY";
    const hit = (lvl: number | null) => lvl !== null && (up ? price >= lvl : price <= lvl);
    const sl = Number(sig.stop_loss);
    const stopped = up ? price <= sl : price >= sl;
    const tp1 = Number(sig.take_profit_1);
    const tp2 = sig.take_profit_2 !== null ? Number(sig.take_profit_2) : null;
    const entry = Number(sig.entry_price);
    const ageBars = (now.getTime() / 1000 - sig.meta.bar_time) / (TF_MS[sig.meta.tf] / 1000);

    if (tp2 !== null && hit(tp2)) {
      await updateSignal(sig.id, { status: "tp_hit", result_pips: calcPips(sig.symbol, sig.direction, entry, tp2), notes: "تحقق الهدف الثاني 🎯🎯" }, { publish: true });
      events.push(`tp2 ${sig.symbol}`);
    } else if (stopped) {
      if (sig.meta.tp1_hit) {
        await updateSignal(sig.id, { status: "closed", result_pips: calcPips(sig.symbol, sig.direction, entry, tp1), notes: "تحقق الهدف الأول ثم عاد السعر للدخول" }, { publish: true });
        events.push(`be ${sig.symbol}`);
      } else {
        await updateSignal(sig.id, { status: "sl_hit", result_pips: calcPips(sig.symbol, sig.direction, entry, sl) }, { publish: true });
        events.push(`sl ${sig.symbol}`);
      }
    } else if (!sig.meta.tp1_hit && hit(tp1)) {
      await db().from("signals").update({ stop_loss: entry, meta: { ...sig.meta, tp1_hit: true } }).eq("id", sig.id);
      await postSignalNote(sig, `✅ <b>تحقق الهدف الأول — ${escapeHtml(sig.symbol)}</b>\n(+${calcPips(sig.symbol, sig.direction, entry, tp1)} نقطة)\n📌 نقل الوقف لنقطة الدخول`);
      events.push(`tp1 ${sig.symbol}`);
    } else if (ageBars >= EXPIRE_BARS) {
      await updateSignal(sig.id, { status: "closed", exit_price: price, notes: `انتهت صلاحية الإشارة بعد ${EXPIRE_BARS} شمعة` }, { publish: true });
      events.push(`expired ${sig.symbol}`);
    }
  }
  return { tracked: open.length, events };
}

export type { StrategyConfig };
