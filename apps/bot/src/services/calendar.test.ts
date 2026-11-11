import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, filterEvents, type RawCalendarEvent } from "./calendar";
import { translateEventTitle } from "./calendar-translate";

const raw: RawCalendarEvent[] = [
  { title: "CPI m/m", country: "USD", date: "2026-11-12T08:30:00-05:00", impact: "High", forecast: "0.3%", previous: "0.2%" },
  { title: "Retail Sales m/m", country: "GBP", date: "2026-11-12T02:00:00-05:00", impact: "Medium" },
  { title: "Bank Holiday", country: "JPY", date: "2026-11-12T00:00:00-05:00", impact: "Holiday" },
  { title: "German Prelim CPI m/m", country: "EUR", date: "2026-11-12T05:00:00-05:00", impact: "High" },
  { title: "RBNZ Gov Speaks", country: "NZD", date: "2026-11-12T03:00:00-05:00", impact: "High" },
];

test("filterEvents keeps only selected impact and currencies, sorted by time", () => {
  const out = filterEvents(raw, { currencies: new Set(["USD", "EUR", "GBP"]), minImpact: "high" });
  assert.deepEqual(out.map((e) => e.currency), ["EUR", "USD"]);
  assert.equal(out[1].title_ar, "مؤشر أسعار المستهلك (شهري)");
  assert.equal(out[1].forecast, "0.3%");
  assert.match(out[1].external_id, /^ff:USD:CPI m\/m:2026-11-12T13:30:00.000Z$/);
});

test("filterEvents with medium impact includes medium events", () => {
  const out = filterEvents(raw, { currencies: new Set(["GBP"]), minImpact: "medium" });
  assert.equal(out.length, 1);
  assert.equal(out[0].title_ar, "مبيعات التجزئة (شهري)");
});

test("translateEventTitle falls back to keywords then original", () => {
  assert.equal(translateEventTitle("RBNZ Gov Speaks"), "خطاب — RBNZ Gov Speaks");
  assert.equal(translateEventTitle("Something Obscure"), "Something Obscure");
});

test("dayKey respects time zone", () => {
  const d = new Date("2026-11-11T22:30:00Z");
  assert.equal(dayKey(d, "UTC"), "2026-11-11");
  assert.equal(dayKey(d, "Asia/Riyadh"), "2026-11-12");
});
