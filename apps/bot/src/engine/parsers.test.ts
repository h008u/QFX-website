import assert from "node:assert/strict";
import { test } from "node:test";
import { surprise } from "../services/calendar";
import { numberOf } from "./fetch";
import { parseCount, parsePreview } from "./views";

test("parseCount handles K/M and commas", () => {
  assert.equal(parseCount("1.2K"), 1200);
  assert.equal(parseCount("3M"), 3_000_000);
  assert.equal(parseCount("1,234"), 1234);
  assert.equal(parseCount("—"), null);
});

test("parsePreview maps message ids to views for the right channel only", () => {
  const html = `
    <div data-post="qfx_signals/101"><span class="tgme_widget_message_views">1.5K</span></div>
    <div data-post="qfx_signals/102"><span class="tgme_widget_message_views">87</span></div>
    <div data-post="other/103"><span class="tgme_widget_message_views">9</span></div>`;
  assert.deepEqual(parsePreview(html, "QFX_signals"), { 101: 1500, 102: 87 });
});

test("numberOf and surprise", () => {
  assert.equal(numberOf("210K"), 210_000);
  assert.equal(numberOf("-0.3%"), -0.3);
  assert.equal(surprise("0.5%", "0.3%")?.label, "⬆️ أعلى من المتوقع — 💥 مفاجأة كبيرة");
  assert.equal(surprise("0.30%", "0.3%"), null);
  assert.equal(surprise("190K", "200K")?.higher, false);
});
