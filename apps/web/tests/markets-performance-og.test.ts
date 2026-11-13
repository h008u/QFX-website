import assert from "node:assert/strict";
import { test } from "node:test";
import type { Signal } from "@qfx/shared";
import { marketFaqs, MARKET_GUIDES } from "@/config/market-guides";
import { MARKETS, marketHref, marketOf } from "@/config/markets";
import { reshapeArabic } from "@/lib/arabic-reshape";
import { rtlLines } from "@/lib/og";
import { computePerformance, demoHistory } from "@/lib/performance";

test("every market has a guide, related markets exist, and links are lowercase paths", () => {
  for (const m of MARKETS) {
    assert.ok(MARKET_GUIDES[m.symbol], `guide for ${m.symbol}`);
    for (const r of MARKET_GUIDES[m.symbol].related) assert.ok(marketOf(r), `${m.symbol} → ${r}`);
    assert.equal(marketHref(m.symbol), `/markets/${m.symbol.toLowerCase()}`);
    assert.equal(marketFaqs(m.symbol, m.name).length, 3);
  }
  assert.equal(marketHref("XAUUSD", "chart"), "/markets/xauusd?view=chart");
  assert.equal(marketOf("xauusd")?.symbol, "XAUUSD");
});

const sig = (i: number, pips: number | null, status: Signal["status"] = pips === null ? "open" : pips > 0 ? "tp_hit" : "sl_hit", day = i + 1): Signal => ({
  id: `s${i}`, symbol: i % 2 ? "EURUSD" : "XAUUSD", asset_class: "forex", direction: "BUY", entry_price: 100, stop_loss: 99, take_profit_1: 102, take_profit_2: null, take_profit_3: null,
  status, result_pips: pips, notes: null, source: "admin", telegram_message_id: null, opened_at: null,
  closed_at: `2026-01-${String(day).padStart(2, "0")}T12:00:00Z`, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
});

test("performance: totals, win rate, drawdown, streaks and profit factor", () => {
  const p = computePerformance([sig(0, 100), sig(1, -40), sig(2, -60), sig(3, 50), sig(4, null), sig(5, 30, "cancelled")]);
  assert.equal(p.trades, 4); // المفتوحة والملغاة مستبعدة
  assert.equal(p.totalPips, 50);
  assert.equal(p.winRate, 50);
  assert.equal(p.maxDrawdown, 100); // من 100 إلى 0
  assert.equal(p.longestLossStreak, 2);
  assert.equal(p.profitFactor, 1.5);
  assert.equal(p.avgRR, 2);
  assert.equal(p.best?.id, "s0");
  assert.equal(p.worst?.id, "s2");
  assert.deepEqual(p.equity.map((e) => e.value), [100, 60, 0, 50]);
});

test("performance: monthly and per-symbol totals add up to the overall total", () => {
  const p = computePerformance(demoHistory(Date.parse("2026-11-13T00:00:00Z")));
  const sum = (xs: { pips: number }[]) => Math.round(xs.reduce((a, b) => a + b.pips, 0) * 10) / 10;
  assert.equal(sum(p.monthly), p.totalPips);
  assert.equal(sum(p.bySymbol), p.totalPips);
  assert.equal(p.equity.at(-1)?.value, p.totalPips);
});

test("performance: empty input is safe", () => {
  const p = computePerformance([]);
  assert.equal(p.trades, 0);
  assert.equal(p.winRate, null);
  assert.equal(p.profitFactor, null);
});

test("Arabic reshaping: contextual forms and lam-alef ligature", () => {
  assert.equal(reshapeArabic("لا"), "ﻻ");
  assert.equal(reshapeArabic("من"), "ﻣﻦ");
  assert.equal(reshapeArabic("ذهب"), "ﺫﻫﺐ");
});

test("RTL lines keep Latin runs readable and wrap by length", () => {
  const lines = rtlLines("إدارة رأس المال مع QFX في 2026", 18);
  assert.ok(lines.length >= 2);
  assert.ok(lines.join(" ").includes("QFX"));
});
