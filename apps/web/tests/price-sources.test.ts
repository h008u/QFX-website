import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseBinanceKlines, parseBinancePrices, parseGoldApi, parseTwelveData, parseYahooChart, parseYahooSpark,
  scaleCandles, toHourly, withLivePrice, type Candle,
} from "../lib/price-sources";

const H = 3600;
const c = (time: number, close: number): Candle => ({ time, open: close, high: close + 1, low: close - 1, close });

test("yahoo chart: skips null points and folds a partial last bar into its hour", () => {
  const t0 = 1794816000; // ساعة كاملة
  const json = {
    chart: {
      result: [{
        meta: { regularMarketPrice: 1.1028 },
        timestamp: [t0 - H, t0, t0 + 706],
        indicators: { quote: [{ open: [1.1, null, 1.102], high: [1.104, 1.2, 1.103], low: [1.099, 1.0, 1.101], close: [1.102, 1.1, 1.1028] }] },
      }],
    },
  };
  const { candles, last } = parseYahooChart(json);
  assert.equal(last, 1.1028);
  assert.deepEqual(candles.map((x) => x.time), [t0 - H, t0]); // النقطة الناقصة حُذفت والجزئية صارت شمعة t0
  assert.equal(candles[1].close, 1.1028);
});

test("yahoo chart: an error payload yields no candles", () => {
  assert.deepEqual(parseYahooChart({ chart: { result: null, error: { code: "Not Found" } } }).candles, []);
  assert.deepEqual(parseYahooChart("garbage").candles, []);
});

test("yahoo spark: maps symbols to their last price", () => {
  const json = { spark: { result: [
    { symbol: "EURUSD=X", response: [{ meta: { regularMarketPrice: 1.1 } }] },
    { symbol: "BAD", response: [{ meta: {} }] },
  ] } };
  assert.deepEqual(parseYahooSpark(json), { "EURUSD=X": 1.1 });
});

test("binance klines and prices", () => {
  const k = [[1794816000000, "64995.1", "64995.2", "64430", "64464.9", "522"], ["bad"]];
  assert.deepEqual(parseBinanceKlines(k), [{ time: 1794816000, open: 64995.1, high: 64995.2, low: 64430, close: 64464.9 }]);
  assert.deepEqual(parseBinancePrices([{ symbol: "BTCUSDT", price: "64274.28" }, { symbol: "X", price: "0" }]), { BTCUSDT: 64274.28 });
  assert.deepEqual(parseBinanceKlines({ code: -1121 }), []);
});

test("gold-api and twelvedata parsing", () => {
  assert.equal(parseGoldApi({ price: 3865.35 }), 3865.35);
  assert.equal(parseGoldApi({ error: "x" }), null);
  assert.deepEqual(parseTwelveData({ status: "error", code: 429 }), []);
  const td = parseTwelveData({ status: "ok", values: [{ datetime: "2026-11-16 09:00:00", open: "1", high: "2", low: "0.5", close: "1.5" }] });
  assert.equal(td[0].close, 1.5);
  assert.equal(td[0].time, Date.UTC(2026, 10, 16, 9) / 1000);
});

test("toHourly merges points of the same hour", () => {
  const out = toHourly([c(10 * H + 60, 5), c(10 * H, 4), c(11 * H, 6)]);
  assert.equal(out.length, 2);
  assert.equal(out[0].close, 5);
  assert.equal(out[0].high, 6);
});

test("scaleCandles applies a sane futures→spot ratio and ignores absurd ones", () => {
  const base = [c(0, 100)];
  assert.equal(scaleCandles(base, 0.99)[0].close, 99);
  assert.equal(scaleCandles(base, 1.5), base);
  assert.equal(scaleCandles(base, NaN), base);
});

test("withLivePrice updates the current bar, opens the next hour, and ignores closed markets", () => {
  const now = 100 * H * 1000;
  const bars = [c(99 * H, 10), c(100 * H, 11)];
  const same = withLivePrice(bars, 12, now + 60_000);
  assert.equal(same.length, 2);
  assert.equal(same[1].close, 12);
  assert.equal(same[1].high, 12);

  const next = withLivePrice(bars, 11.5, now + H * 1000);
  assert.equal(next.length, 3);
  assert.equal(next[2].open, 11);

  assert.equal(withLivePrice(bars, 11.5, now + 48 * H * 1000), bars); // عطلة: لا شمعة جديدة
  assert.equal(withLivePrice(bars, 50, now), bars); // سعر بعيد جداً = خطأ في المصدر
});
