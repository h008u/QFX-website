import { test } from "node:test";
import assert from "node:assert/strict";
import { calcPips, detectAssetClass, formatSignalMessage, parseSignalCommand, validateSignalInput } from "./index";

test("parseSignalCommand parses full command", () => {
  const r = parseSignalCommand("/signal BUY xauusd 2350.5 SL 2340 TP 2360 TP2 2370 دخول من الدعم");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.symbol, "XAUUSD");
  assert.equal(r.value.direction, "BUY");
  assert.equal(r.value.entry_price, 2350.5);
  assert.equal(r.value.stop_loss, 2340);
  assert.equal(r.value.take_profit_1, 2360);
  assert.equal(r.value.take_profit_2, 2370);
  assert.equal(r.value.asset_class, "gold");
  assert.equal(r.value.notes, "دخول من الدعم");
});

test("parseSignalCommand accepts Arabic direction, symbol-first and Arabic digits", () => {
  const r = parseSignalCommand("EURUSD بيع ١٫٠٨٥٠ SL 1.0880 TP 1.0800");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.direction, "SELL");
  assert.equal(r.value.entry_price, 1.085);
  assert.equal(r.value.asset_class, "forex");
});

test("parseSignalCommand requires SL and TP", () => {
  assert.equal(parseSignalCommand("BUY EURUSD 1.08 TP 1.09").ok, false);
  assert.equal(parseSignalCommand("BUY EURUSD 1.08 SL 1.07").ok, false);
});

test("validateSignalInput catches inverted levels", () => {
  const errs = validateSignalInput({ symbol: "EURUSD", direction: "BUY", entry_price: 1.08, stop_loss: 1.09, take_profit_1: 1.07 });
  assert.equal(errs.length, 2);
  assert.deepEqual(
    validateSignalInput({ symbol: "EURUSD", direction: "SELL", entry_price: 1.08, stop_loss: 1.09, take_profit_1: 1.07 }),
    [],
  );
});

test("calcPips handles JPY, gold and majors", () => {
  assert.equal(calcPips("EURUSD", "BUY", 1.08, 1.085), 50);
  assert.equal(calcPips("USDJPY", "SELL", 150.0, 149.5), 50);
  assert.equal(calcPips("XAUUSD", "BUY", 2350, 2340), -100);
});

test("detectAssetClass", () => {
  assert.equal(detectAssetClass("USOIL"), "oil");
  assert.equal(detectAssetClass("NAS100"), "indices");
  assert.equal(detectAssetClass("BTCUSD"), "crypto");
});

test("formatSignalMessage escapes HTML", () => {
  const msg = formatSignalMessage({ symbol: "EURUSD", direction: "BUY", entry_price: 1.08, stop_loss: 1.07, take_profit_1: 1.1, notes: "<b>x</b>" });
  assert.match(msg, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(msg, /1:2/);
});
