import assert from "node:assert/strict";
import { before, test } from "node:test";

// اختبارات طبقة HTTP (المصادقة والتوجيه) عبر معالج Vercel نفسه — بدون قاعدة بيانات أو تيليجرام
let handler: typeof import("./vercel").handler;

before(async () => {
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: "1:test",
    TELEGRAM_WEBHOOK_SECRET: "tg-secret",
    SUPABASE_URL: "http://unused",
    SUPABASE_SERVICE_ROLE_KEY: "k",
    BOT_API_KEY: "api-key",
    TRADINGVIEW_WEBHOOK_SECRET: "tv-secret",
    MT5_SECRET: "mt5-secret",
  });
  ({ handler } = await import("./vercel"));
});

const call = (path: string, init: RequestInit = {}) => handler(new Request(`https://bot.example${path}`, init));
const json = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("health is public", async () => {
  const r = await call("/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
});

test("telegram webhook rejects a missing or wrong secret token", async () => {
  assert.equal((await call("/telegram/webhook", json({}))).status, 401);
  assert.equal((await call("/telegram/webhook", json({}, { "X-Telegram-Bot-Api-Secret-Token": "nope" }))).status, 401);
});

test("private API requires the bearer key", async () => {
  assert.equal((await call("/api/status")).status, 401);
  assert.equal((await call("/api/jobs/tick", { method: "POST", headers: { Authorization: "Bearer wrong" } })).status, 401);
});

test("tradingview webhook rejects a wrong secret", async () => {
  assert.equal((await call("/webhooks/tradingview?secret=bad", json({ symbol: "XAUUSD" }))).status, 401);
  assert.equal((await call("/webhooks/tradingview", json({ secret: "bad", symbol: "XAUUSD" }))).status, 401);
});

test("mt5 accepts the secret in the X-QFX-Secret header", async () => {
  const ping = { type: "ping" };
  assert.equal((await call("/mt5", json(ping))).status, 401);
  assert.equal((await call("/mt5", json(ping, { "X-QFX-Secret": "wrong" }))).status, 401);
  const ok = await call("/mt5", json(ping, { "X-QFX-Secret": "mt5-secret" }));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, pong: true });
});

test("mt5 legacy secret-in-path URL still works", async () => {
  assert.equal((await call("/mt5/wrong", json({ type: "ping" }))).status, 401);
  assert.equal((await call("/mt5/mt5-secret", json({ type: "ping" }))).status, 200);
  assert.equal((await call("/mt5/mt5-secret", json({}))).status, 400);
});
