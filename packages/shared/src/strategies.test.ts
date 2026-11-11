import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLevels, computeRows, demoBars, inSession, simulate, STRATEGIES, STRATEGY_IDS, type Bar } from "./strategies";

test("indicators: EMA20 seed equals SMA20, RSI within 0..100, ATR positive", () => {
  const bars: Bar[] = Array.from({ length: 60 }, (_, i) => [i * 3600, 100 + i, 101 + i, 99 + i, 100 + i]);
  const rows = computeRows(bars);
  // أول قيمة EMA20 = متوسط أول 20 إغلاق: (100+...+119)/20 = 109.5
  assert.equal(rows[19].EMA20, 109.5);
  assert.equal(rows[18].EMA20, null);
  // سعر صاعد باستمرار ← RSI = 100
  assert.equal(rows[40].RSI, 100);
  assert.ok((rows[40].ATR as number) > 0);
});

test("all 9 strategies are defined and return null on flat data", () => {
  assert.equal(STRATEGY_IDS.length, 9);
  const flat: Bar[] = Array.from({ length: 260 }, (_, i) => [i * 3600, 1, 1, 1, 1]);
  const rows = computeRows(flat);
  for (const id of STRATEGY_IDS) assert.equal(STRATEGIES[id].rule(rows[259], rows[258]), null, id);
});

test("buildLevels: buy below/above entry with R multiples", () => {
  const c = { time: 0, open: 2650, high: 2652, low: 2648, close: 2650, ATR: 10, "BB.lower": 2630, "BB.upper": 2670 } as never;
  const lv = buildLevels("XAUUSD", "buy", c, { stop: "atr", atr_mult: 1.5, fixed_pips: 30, tp1_r: 1, tp2_r: 2 });
  assert.deepEqual(lv, { entry: 2650, sl: 2635, tp1: 2665, tp2: 2680, risk_pips: 150 });
  const pips = buildLevels("EURUSD", "sell", { ...(c as object), close: 1.08, ATR: 0.001 } as never, { stop: "pips", atr_mult: 1.5, fixed_pips: 30, tp1_r: 1, tp2_r: 2 });
  assert.equal(pips.sl, 1.083);
  assert.equal(pips.tp2, 1.074);
});

test("simulate produces consistent stats on demo data", () => {
  const bars = demoBars("XAUUSD", 1500, 3600_000);
  const r = simulate("trend", bars, { stop: "atr", atr_mult: 1.5, fixed_pips: 30, tp1_r: 1, tp2_r: 2, session: "all", tf: "1h" }, "XAUUSD");
  assert.equal(r.bars, 1500);
  assert.equal(r.trades, r.curve.length);
  assert.ok(r.wins + r.losses <= r.trades);
  assert.equal(r.curve.at(-1)?.pips ?? 0, r.pips);
  assert.ok(r.maxDrawdown >= 0);
});

test("inSession uses UTC hours", () => {
  assert.equal(inSession("london", Date.UTC(2026, 0, 5, 8)), true);
  assert.equal(inSession("london", Date.UTC(2026, 0, 5, 17)), false);
  assert.equal(inSession("all", Date.UTC(2026, 0, 5, 23)), true);
});
