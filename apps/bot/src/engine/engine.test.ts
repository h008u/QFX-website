import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { FakeDb } from "../../test/fake-db";
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
