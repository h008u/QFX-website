import assert from "node:assert/strict";
import { test } from "node:test";
import { jsonLdScript } from "@/lib/jsonld";
import { htmlToText, readingMinutes, sanitizeRichHtml, slugify } from "@/lib/sanitize";

test("sanitizeRichHtml strips scripts, event handlers and javascript: links", () => {
  const out = sanitizeRichHtml(`<p onclick="x()">مرحبا</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="y()"><iframe src="https://evil"></iframe>`);
  assert.doesNotMatch(out, /<script|onclick|onerror|javascript:|<iframe/i);
  assert.match(out, /<p>مرحبا<\/p>/);
});

test("sanitizeRichHtml keeps editor formatting and hardens external links", () => {
  const out = sanitizeRichHtml(`<h2>عنوان</h2><ul><li>بند</li></ul><blockquote>اقتباس</blockquote><a href="https://example.com">رابط</a><a href="/blog">داخلي</a>`);
  assert.match(out, /<h2>عنوان<\/h2>/);
  assert.match(out, /<li>بند<\/li>/);
  assert.match(out, /href="https:\/\/example.com" target="_blank" rel="noopener nofollow ugc"/);
  assert.match(out, /<a href="\/blog">داخلي<\/a>/);
});

test("sanitizeRichHtml lazy-loads images and drops protocol-relative sources", () => {
  assert.match(sanitizeRichHtml(`<img src="https://cdn.example.com/a.png" alt="x">`), /loading="lazy"/);
  assert.doesNotMatch(sanitizeRichHtml(`<img src="//evil.com/a.png">`), /evil/);
});

test("jsonLdScript cannot break out of its script tag", () => {
  const s = jsonLdScript({ name: "</script><script>alert(1)</script>", q: "a & b" });
  assert.doesNotMatch(s, /<\/?script/i);
  assert.equal(JSON.parse(s).name, "</script><script>alert(1)</script>");
  assert.equal(JSON.parse(s).q, "a & b");
});

test("slugify keeps Arabic, drops diacritics and unsafe characters", () => {
  assert.equal(slugify("ما هو الفوركس؟ دليل المبتدئ"), "ما-هو-الفوركس-دليل-المبتدئ");
  assert.equal(slugify("إدارةُ رأسِ المال"), "إدارة-رأس-المال");
  assert.equal(slugify("  Gold / XAUUSD #1 "), "gold-xauusd-1");
  assert.doesNotMatch(slugify("a/b?c#d%e"), /[/?#%]/);
});

test("htmlToText and readingMinutes", () => {
  assert.equal(htmlToText("<p>واحد <b>اثنان</b></p><p>ثلاثة</p>"), "واحد اثنان ثلاثة");
  assert.equal(readingMinutes("<p>كلمة</p>"), 1);
  assert.equal(readingMinutes(`<p>${"كلمة ".repeat(1000)}</p>`), 5);
});
