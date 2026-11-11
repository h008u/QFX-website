import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categorize, checkRules, decidePolicy, DEFAULT_SETTINGS, fillTemplate, findDuplicate, fingerprint, inQuietHours,
  isSlotDue, localParts, mergeSettings, quietEndsAt, renderMarkup, scoreNews, similarity, templateFields,
} from "./index";

test("categorize detects categories in Arabic and English", () => {
  assert.deepEqual(categorize("Gold jumps as Fed signals rate cut"), ["central", "gold"]);
  assert.ok(categorize("ارتفاع أسعار النفط بعد قرار أوبك").includes("oil"));
  assert.deepEqual(categorize("Generic company news"), []);
});

test("scoreNews rewards focus markets and strong drivers", () => {
  const strong = scoreNews("Breaking: Gold surges to record as Fed cuts rates", ["gold"]);
  const weak = scoreNews("Sponsored webinar: how to trade", ["gold"]);
  assert.ok(strong.score >= 90, `strong=${strong.score}`);
  assert.equal(strong.level, "high");
  assert.ok(weak.score < 20);
});

test("fingerprint dedupes across languages but keeps opposite direction apart", () => {
  const a = fingerprint("Gold rises to record high");
  const b = fingerprint("الذهب يرتفع لمستوى قياسي");
  const c = fingerprint("الذهب ينخفض من مستوى قياسي");
  assert.ok(similarity(a, b) >= 0.7, `sim=${similarity(a, b)}`);
  assert.equal(similarity(a, c), 0);
  assert.ok(findDuplicate(b, [{ fingerprint: a }]));
  assert.equal(findDuplicate(c, [{ fingerprint: a }]), null);
});

test("numbers must match for duplicates", () => {
  assert.equal(similarity(fingerprint("US CPI rises 3.1%"), fingerprint("US CPI rises 2.9%")), 0);
});

test("renderMarkup escapes HTML and converts formatting", () => {
  assert.equal(
    renderMarkup("**مهم** __جداً__ <x> [رابط](https://a.com/?q=1&b=2)"),
    '<b>مهم</b> <i>جداً</i> &lt;x&gt; <a href="https://a.com/?q=1&amp;b=2">رابط</a>',
  );
  assert.equal(renderMarkup("[x](javascript:alert(1))"), "[x](javascript:alert(1))");
});

test("fillTemplate removes lines with empty fields", () => {
  const body = "صفقة {الرمز}\nالهدف 2: {الهدف 2}\nثابت";
  assert.deepEqual(templateFields(body), ["الرمز", "الهدف 2"]);
  assert.equal(fillTemplate(body, { "الرمز": "XAUUSD" }), "صفقة XAUUSD\nثابت");
});

test("decidePolicy", () => {
  const rule = { mode: "score" as const, auto: 70, approve: 40 };
  assert.equal(decidePolicy(rule, 80), "auto");
  assert.equal(decidePolicy(rule, 50), "pending");
  assert.equal(decidePolicy(rule, 10), "blocked");
  assert.equal(decidePolicy({ ...rule, mode: "approval" }, 99), "pending");
});

test("checkRules", () => {
  const r = checkRules("Gold sponsored post about Iran", { ...DEFAULT_SETTINGS.rules, required: ["gold"], watch: ["iran"] });
  assert.equal(r.banned, "sponsored");
  assert.equal(r.missingRequired, false);
  assert.deepEqual(r.watched, ["iran"]);
  assert.equal(checkRules("oil", { ...DEFAULT_SETTINGS.rules, required: ["gold"] }).missingRequired, true);
});

test("mergeSettings deep merges stored values over defaults", () => {
  const s = mergeSettings([
    { key: "general", value: { signature: "QFX" } },
    { key: "calendar", value: { currencies: ["USD"] } },
    { key: "unknown", value: 1 },
  ]);
  assert.equal(s.general.signature, "QFX");
  assert.equal(s.general.timezone, "Asia/Riyadh");
  assert.deepEqual(s.calendar.currencies, ["USD"]);
  assert.equal(s.calendar.pre_alert_min, 15);
});

test("schedule helpers", () => {
  const now = new Date("2026-11-13T05:10:00Z"); // 08:10 الرياض، الجمعة
  const p = localParts(now, "Asia/Riyadh");
  assert.equal(p.time, "08:10");
  assert.equal(p.weekday, 5);
  assert.equal(isSlotDue({ now, timeZone: "Asia/Riyadh", time: "08:00" }).due, true);
  assert.equal(isSlotDue({ now, timeZone: "Asia/Riyadh", time: "08:00", lastRunDate: "2026-11-13" }).due, false);
  assert.equal(isSlotDue({ now, timeZone: "Asia/Riyadh", time: "08:00", days: [1, 2, 3, 4] }).due, false);
  assert.equal(isSlotDue({ now, timeZone: "Asia/Riyadh", time: "09:00" }).due, false);
  assert.equal(isSlotDue({ now, timeZone: "Asia/Riyadh", time: "03:00", graceMin: 120 }).due, false);
  assert.equal(inQuietHours(now, "Asia/Riyadh", "23:00", "09:00"), true);
  assert.equal(inQuietHours(now, "Asia/Riyadh", "09:00", "17:00"), false);
  assert.equal(quietEndsAt(now, "Asia/Riyadh", "09:00").toISOString(), "2026-11-13T06:00:00.000Z");
});

test("sanitizeTelegramHtml keeps telegram tags only", async () => {
  const { sanitizeTelegramHtml } = await import("./index");
  assert.equal(
    sanitizeTelegramHtml('<b>ok</b> <img src=x onerror=alert(1)> <a href="https://a.com">l</a> <a href="javascript:x">j</a> a &amp; b'),
    '<b>ok</b> &lt;img src=x onerror=alert(1)&gt; <a href="https://a.com">l</a> &lt;a href="javascript:x"&gt;j</a> a &amp; b',
  );
});
