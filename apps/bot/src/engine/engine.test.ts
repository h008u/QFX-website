import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { FakeDb } from "@qfx/shared/fake-db";
import { FakeTelegram } from "../../test/fake-telegram";

const tg = new FakeTelegram();
let fake: FakeDb;
// يُحمّل بعد ضبط المتغيرات (getEnv يخزّنها)
let m: {
  intake: typeof import("./intake").intake;
  publishPost: typeof import("./publish").publishPost;
  publishDue: typeof import("./tick").publishDue;
  runTick: typeof import("./tick").runTick;
  postGreeting: typeof import("./greetings").postGreeting;
  runGreetings: typeof import("./greetings").runGreetings;
  shouldTrigger: typeof import("./alerts").shouldTrigger;
  loadSettings: typeof import("./config").loadSettings;
  invalidate: typeof import("./config").invalidateSettings;
  createSignal: typeof import("../services/signals").createSignal;
  updateSignal: typeof import("../services/signals").updateSignal;
  setDb: typeof import("../supabase").setDbForTests;
  handleMt5Event: typeof import("./mt5").handleMt5Event;
  baseSymbol: typeof import("./mt5").baseSymbol;
  runStrategies: typeof import("./strategies").runStrategies;
  trackStrategySignals: typeof import("./strategies").trackStrategySignals;
};

before(async () => {
  await tg.start();
  Object.assign(process.env, {
    TELEGRAM_BOT_TOKEN: "1:test",
    TELEGRAM_WEBHOOK_SECRET: "secret",
    TELEGRAM_CHANNEL_ID: "@main",
    TELEGRAM_ADMIN_IDS: "777",
    SUPABASE_URL: "http://unused",
    SUPABASE_SERVICE_ROLE_KEY: "k",
    BOT_API_KEY: "k",
    TELEGRAM_API_ROOT: tg.url,
  });
  m = {
    ...(await import("./intake")),
    ...(await import("./publish")),
    ...(await import("./tick")),
    ...(await import("./greetings")),
    ...(await import("./alerts")),
    loadSettings: (await import("./config")).loadSettings,
    invalidate: (await import("./config")).invalidateSettings,
    ...(await import("../services/signals")),
    setDb: (await import("../supabase")).setDbForTests,
    ...(await import("./mt5")),
    ...(await import("./strategies")),
  } as typeof m;
});

after(() => tg.stop());

beforeEach(() => {
  fake = new FakeDb();
  m.setDb(fake);
  m.invalidate();
  tg.reset();
});

const setting = (key: string, value: unknown) => fake.t("settings").push({ key, value });
const twoDestinations = () =>
  setting("destinations", [
    { id: "ch", chat_id: "@main", label: "القناة", kinds: "all", enabled: true },
    { id: "grp", chat_id: "-100500", thread_id: 9, label: "المجموعة", kinds: ["news", "signal"], enabled: true },
  ]);

test("manual post publishes to every destination that accepts its kind, with signature", async () => {
  twoDestinations();
  setting("general", { signature: "**QFX** [t.me](https://t.me/qfx)" });
  fake.t("posts").push({ id: "p1", kind: "manual", status: "scheduled", body: "مرحبا <x>", format: "markup", results: [], disclaimer: true });
  const p = await m.publishPost("p1");
  assert.equal(p.status, "published");
  const sends = tg.sends();
  assert.equal(sends.length, 1, "manual goes to channel only (group accepts news/signal)");
  assert.equal(sends[0].params.chat_id, "@main");
  assert.match(sends[0].params.text, /مرحبا &lt;x&gt;/);
  assert.match(sends[0].params.text, /ليس توصية مالية/);
  assert.match(sends[0].params.text, /<b>QFX<\/b> <a href="https:\/\/t.me\/qfx">t.me<\/a>/);
});

test("partial failure then resend only to failed destination", async () => {
  twoDestinations();
  tg.failChats.add("-100500");
  fake.t("posts").push({ id: "p2", kind: "news", status: "scheduled", body: "خبر", format: "markup", results: [], disclaimer: false });
  let p = await m.publishPost("p2");
  assert.equal(p.status, "partial");
  assert.equal(p.results.filter((r) => r.ok).length, 1);
  assert.match(p.results.find((r) => !r.ok)!.error!, /not a member/);
  // الموضوع داخل المجموعة
  assert.equal(tg.sends().find((c) => c.params.chat_id === "-100500")?.params.message_thread_id, 9);

  tg.failChats.clear();
  const before = tg.sends().length;
  p = await m.publishPost("p2", { onlyFailed: true });
  assert.equal(p.status, "published");
  assert.equal(tg.sends().length - before, 1, "only the failed destination is retried");
  assert.equal(p.results.length, 2);
});

test("a post cannot be published twice", async () => {
  fake.t("posts").push({ id: "p3", kind: "manual", status: "published", body: "x", format: "markup", results: [] });
  await assert.rejects(() => m.publishPost("p3"), /لا تسمح/);
});

test("intake: banned word, required word, policy score, duplicate across languages", async () => {
  const s = await m.loadSettings();
  const base = { kind: "news" as const, policy: "news" as const, dedupe: true };

  let r = await m.intake({ ...base, title: "Sponsored gold webinar", body: "x", external_id: "a", score: 90 }, s);
  assert.equal(r.outcome, "filtered");

  r = await m.intake({ ...base, title: "Gold rises to record high", body: "x", external_id: "b", score: 85 }, s);
  assert.equal(r.outcome, "published");

  r = await m.intake({ ...base, title: "الذهب يرتفع لمستوى قياسي", body: "x", external_id: "c", score: 85 }, s);
  assert.equal(r.outcome, "duplicate");

  r = await m.intake({ ...base, title: "Oil inventories data", body: "x", external_id: "d", score: 50 }, s);
  assert.equal(r.outcome, "pending");
  const dm = tg.sends().find((c) => c.params.chat_id === 777);
  assert.ok(dm, "admin got approval DM");
  assert.deepEqual(dm!.params.reply_markup.inline_keyboard[0].map((b: any) => b.callback_data.slice(0, 4)), ["p:a:", "p:r:"]);

  r = await m.intake({ ...base, title: "Some low value item", body: "x", external_id: "e", score: 10 }, s);
  assert.equal(r.outcome, "filtered");

  r = await m.intake({ ...base, title: "dup id", body: "x", external_id: "e", score: 10 }, s);
  assert.equal(r.outcome, "exists");
});

test("intake: watch words notify admins even when auto-published", async () => {
  setting("rules", { watch: ["iran"] });
  const s = await m.loadSettings();
  const r = await m.intake({ kind: "news", title: "Iran tensions lift oil", body: "x", score: 90, policy: "news" }, s);
  assert.equal(r.outcome, "published");
  assert.ok(tg.sends().some((c) => c.params.chat_id === 777 && /كلمة مراقبة/.test(c.params.text)));
});

test("intake: pause holds content; quiet hours schedules it unless breaking", async () => {
  setting("general", { paused: true });
  let s = await m.loadSettings(true);
  let r = await m.intake({ kind: "news", title: "Fed cuts rates", body: "x", score: 95, policy: "news" }, s);
  assert.equal(r.outcome, "pending");

  fake.tables.settings = [];
  setting("rules", { quiet: { enabled: true, start: "00:00", end: "23:59", allowBreaking: true } });
  s = await m.loadSettings(true);
  r = await m.intake({ kind: "news", title: "Gold steady", body: "x", score: 95, policy: "news" }, s);
  assert.equal(r.outcome, "scheduled");
  assert.ok("post" in r && r.post.scheduled_at);

  r = await m.intake({ kind: "news", title: "Breaking: war", body: "x", score: 95, policy: "news", breaking: true }, s);
  assert.equal(r.outcome, "published");
});

test("publishDue publishes due posts and caps news after quiet hours at 5", async () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  for (let i = 0; i < 7; i++) {
    fake.t("posts").push({ id: `q${i}`, kind: "news", status: "scheduled", reason: "ساعات الهدوء", body: `n${i}`, format: "markup", results: [], scheduled_at: past, created_at: `2026-11-13T0${i}:00:00Z` });
  }
  fake.t("posts").push({ id: "future", kind: "manual", status: "scheduled", body: "later", format: "markup", results: [], scheduled_at: new Date(Date.now() + 3600_000).toISOString() });
  const r = await m.publishDue();
  assert.deepEqual(r, { due: 7, published: 5, failed: 0, dropped: 2 });
  assert.equal(fake.t("posts").find((p) => p.id === "future")!.status, "scheduled");
  assert.equal(fake.t("posts").find((p) => p.id === "q0")!.status, "filtered", "oldest dropped");
});

test("signals: opening post and threaded update in each destination", async () => {
  twoDestinations();
  const sig = await m.createSignal({ symbol: "xauusd", direction: "BUY", entry_price: 2650, stop_loss: 2630, take_profit_1: 2680 });
  assert.ok(sig.telegram_message_id);
  const opening = tg.sends().map((c) => ({ chat: c.params.chat_id, text: c.params.text }));
  assert.equal(opening.length, 2);
  const firstIds = Object.fromEntries(
    fake.t("posts").find((p) => p.external_id === `signal:${sig.id}`)!.results.map((r: any) => [r.chat_id, r.message_id]),
  );
  tg.reset();
  const updated = await m.updateSignal(sig.id.slice(0, 8), { status: "tp_hit" });
  assert.equal(updated.result_pips, 300);
  const replies = tg.sends();
  assert.equal(replies.length, 2);
  for (const r of replies) assert.equal(r.params.reply_parameters.message_id, firstIds[r.params.chat_id]);
});

test("greetings: due once per day, caption rotation, holiday handling", async () => {
  setting("general", { timezone: "UTC" });
  setting("greetings", { morning: { enabled: true, time: "06:00", weekdays_only: false }, open: { enabled: false }, close: { enabled: false } });
  const s = await m.loadSettings(true);
  const at = new Date("2026-11-12T06:30:00Z");
  let r = await m.runGreetings(s, at);
  assert.ok((r as any).morning);
  r = await m.runGreetings(s, new Date("2026-11-12T07:00:00Z"));
  assert.equal(Object.keys(r).length, 0, "not twice the same day");
  const texts = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await m.postGreeting("morning", s, at, true);
    texts.add(tg.sends().at(-1)!.params.text);
  }
  const all = tg.sends().map((c) => c.params.text);
  for (let i = 1; i < all.length; i++) assert.notEqual(all[i], all[i - 1], "never the same caption twice in a row");

  const xmas = new Date("2026-12-25T23:40:00Z");
  assert.ok("skipped" in (await m.postGreeting("close", s, xmas)));
});

test("price alert trigger rules", () => {
  const a = { id: "1", symbol: "XAUUSD", direction: "above" as const, price: 2400, note: null, repeat: false, cooldown_min: 60, last_price: null, triggered_at: null, trigger_count: 0 };
  const now = new Date();
  assert.equal(m.shouldTrigger(a, 2399, now), false);
  assert.equal(m.shouldTrigger(a, 2401, now), true);
  assert.equal(m.shouldTrigger({ ...a, triggered_at: now.toISOString() }, 2401, now), false, "one-shot");
  const repeat = { ...a, repeat: true, triggered_at: new Date(now.getTime() - 2 * 3600_000).toISOString() };
  assert.equal(m.shouldTrigger({ ...repeat, last_price: 2402 }, 2405, now), false, "must cross again");
  assert.equal(m.shouldTrigger({ ...repeat, last_price: 2390 }, 2405, now), true);
  assert.equal(m.shouldTrigger({ ...repeat, last_price: 2390, triggered_at: now.toISOString() }, 2405, now), false, "cooldown");
});

test("tick lock prevents concurrent runs and records task results", async () => {
  setting("news", { enabled: false });
  setting("weekly", { enabled: false });
  setting("calendar", { agenda_enabled: false, pre_alert_enabled: false });
  const [a, b] = await Promise.all([m.runTick(new Date(), ["publish_due"]), m.runTick(new Date(), ["publish_due"])]);
  const skipped = [a, b].filter((x) => "skipped" in x);
  assert.equal(skipped.length, 1);
  const run = fake.t("task_runs").find((r) => r.task === "publish_due");
  assert.equal(run?.ok, true);
  assert.equal(fake.t("task_runs").find((r) => r.task === "_tick_lock")?.last_run_at, null, "lock released");
});

test("mt5: symbol normalization", () => {
  assert.equal(m.baseSymbol("XAUUSDm"), "XAUUSD");
  assert.equal(m.baseSymbol("EURUSD.pro"), "EURUSD");
  assert.equal(m.baseSymbol("GOLD#"), "XAUUSD");
  assert.equal(m.baseSymbol("US30"), "US30");
});

test("mt5: open → modify → partial → close flows into signals and threaded posts", async () => {
  twoDestinations();
  setting("mt5", { enabled: true });
  const s = await m.loadSettings(true);
  await m.handleMt5Event({ type: "account", balance: 1000, equity: 1010 }, s);
  assert.equal(fake.t("settings").find((r) => r.key === "state.mt5")?.value.account.balance, 1000);

  await m.handleMt5Event({ type: "open", ticket: 77, symbol: "XAUUSDm", side: "buy", price: 2650, sl: 0, tp: 0, volume: 0.1 }, s);
  const sig = fake.t("signals").find((x) => x.external_ref === "mt5:77")!;
  assert.equal(sig.symbol, "XAUUSD");
  assert.equal(sig.stop_loss, null);
  assert.equal(sig.source, "mt5");
  const opening = tg.sends();
  assert.equal(opening.length, 2);
  assert.doesNotMatch(opening[0].params.text, /وقف الخسارة/, "no empty SL line");

  // نفس الحدث مرتين لا ينشئ توصية ثانية
  await m.handleMt5Event({ type: "open", ticket: 77, symbol: "XAUUSDm", side: "buy", price: 2650 }, s);
  assert.equal(fake.t("signals").filter((x) => x.external_ref === "mt5:77").length, 1);

  tg.reset();
  await m.handleMt5Event({ type: "modify", ticket: 77, symbol: "XAUUSDm", sl: 2650, tp: 2680 }, s);
  const mod = tg.sends();
  assert.equal(mod.length, 2);
  assert.match(mod[0].params.text, /بدون مخاطرة/);
  assert.ok(mod[0].params.reply_parameters?.message_id, "threaded under the opening message");

  tg.reset();
  await m.handleMt5Event({ type: "close", ticket: 77, symbol: "XAUUSDm", side: "buy", price: 2665, partial: true, reason: "manual" }, s);
  assert.match(tg.sends()[0].params.text, /إغلاق جزئي/);
  assert.equal(fake.t("signals").find((x) => x.id === sig.id)!.status, "open");

  await m.handleMt5Event({ type: "close", ticket: 77, symbol: "XAUUSDm", side: "buy", price: 2680, reason: "tp" }, s);
  const closed = fake.t("signals").find((x) => x.id === sig.id)!;
  assert.equal(closed.status, "tp_hit");
  assert.equal(closed.result_pips, 300);
});

test("mt5: disabled in panel → trades ignored", async () => {
  const s = await m.loadSettings(true);
  const r = await m.handleMt5Event({ type: "open", ticket: 9, symbol: "EURUSD", side: "sell", price: 1.08 }, s);
  assert.match(r.note ?? "", /مطفي/);
  assert.equal(fake.t("signals").length, 0);
});

test("strategies: fires on a closed candle, then TP1 moves stop to entry and TP2 closes", async () => {
  const { computeRows, demoBars, STRATEGIES } = await import("@qfx/shared");
  const all = demoBars("XAUUSD", 1200, 3600_000);
  const rows = computeRows(all);
  let idx = -1;
  for (let i = 260; i < rows.length; i++) if (STRATEGIES.trend.rule(rows[i], rows[i - 1])) { idx = i; break; }
  assert.ok(idx > 0, "demo data should contain a trend signal");
  const bars = all.slice(0, idx + 1);
  const now = new Date((bars.at(-1)![0] + 3600 + 60) * 1000); // بعد إغلاق الشمعة
  setting("strategies", {
    enabled: true,
    symbols: ["XAUUSD"],
    list: [{ id: "trend", enabled: true, publish: true, tf: "1h", stop: "atr", atr_mult: 1.5, fixed_pips: 30, tp1_r: 1, tp2_r: 2, max_per_day: 3, avoid_news_min: 0, session: "all", confirm: null }],
  });
  const s = await m.loadSettings(true);
  const r = await m.runStrategies(s, now, { candles: async () => bars });
  assert.equal((r as { created: string[] }).created.length, 1, JSON.stringify(r));
  const sig = fake.t("signals")[0];
  assert.equal(sig.source, "strategy");
  assert.match(sig.strategy, /تقاطع الاتجاه/);
  assert.match(tg.sends()[0].params.text, /الاستراتيجية/);

  // نفس الشمعة مرة ثانية لا تكرر الإشارة
  await m.runStrategies(s, now, { candles: async () => bars });
  assert.equal(fake.t("signals").length, 1);

  const up = sig.direction === "BUY";
  tg.reset();
  await m.trackStrategySignals(s, now, new Map([["XAUUSD", Number(sig.take_profit_1) + (up ? 0.01 : -0.01)]]));
  const afterTp1 = fake.t("signals")[0];
  assert.equal(afterTp1.stop_loss, Number(sig.entry_price), "stop moved to entry");
  assert.equal(afterTp1.meta.tp1_hit, true);
  assert.match(tg.sends()[0].params.text, /الهدف الأول/);

  await m.trackStrategySignals(s, now, new Map([["XAUUSD", Number(sig.take_profit_2) + (up ? 0.01 : -0.01)]]));
  const done = fake.t("signals")[0];
  assert.equal(done.status, "tp_hit");
  assert.ok(Number(done.result_pips) > 0);
});

test("strategies: back to entry after TP1 closes at TP1 profit (not a loss)", async () => {
  fake.t("signals").push({ id: "5e1f0000-0000-4000-8000-000000000001", symbol: "EURUSD", direction: "BUY", entry_price: 1.08, stop_loss: 1.08, take_profit_1: 1.082, take_profit_2: 1.084, status: "open", source: "strategy", meta: { strategy_id: "trend", tf: "1h", tp1_hit: true, bar_time: Math.floor(Date.now() / 1000) }, result_pips: null });
  const s = await m.loadSettings(true);
  await m.trackStrategySignals(s, new Date(), new Map([["EURUSD", 1.0799]]));
  const r = fake.t("signals")[0];
  assert.equal(r.status, "closed");
  assert.equal(r.result_pips, 20);
});
