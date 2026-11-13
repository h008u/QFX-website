import assert from "node:assert/strict";
import { test } from "node:test";
import { blockSectionId, DEFAULT_CONTENT, newBlock, normalizeContent, TEXT_FIELDS } from "@/config/site-content";
import { ALLOW_ALL, DENY_ALL, effective, parse, serialise } from "@/lib/consent";

test("consent round-trips and rejects malformed cookies", () => {
  assert.deepEqual(parse(serialise(ALLOW_ALL)), ALLOW_ALL);
  assert.deepEqual(parse("1-0-1"), { analytics: true, marketing: false, external: true });
  for (const bad of ["", "1-1", "1-1-1-1", "1-x-1", "yes"]) assert.equal(parse(bad), null);
});

test("no answer means nothing is allowed", () => {
  assert.deepEqual(effective(null), DENY_ALL);
});

test("normalizeContent fills defaults for empty or garbage input", () => {
  for (const raw of [null, undefined, "x", 42, {}]) {
    const c = normalizeContent(raw);
    assert.equal(c.sections.length, DEFAULT_CONTENT.sections.length);
    assert.equal(Object.keys(c.texts).length, Object.keys(TEXT_FIELDS).length);
  }
});

test("normalizeContent keeps saved order, drops unknown sections and appends new built-ins", () => {
  const c = normalizeContent({ sections: [{ id: "join", visible: false }, { id: "hacker" }, { id: "hero", visible: true }] });
  assert.equal(c.sections[0].id, "join");
  assert.equal(c.sections[0].visible, false);
  assert.ok(!c.sections.some((s) => s.id === "hacker"));
  assert.equal(new Set(c.sections.map((s) => s.id)).size, c.sections.length);
});

test("normalizeContent clips long texts and rejects unsafe links", () => {
  const c = normalizeContent({ texts: { "hero.title1": "x".repeat(500) }, announcement: { visible: true, text: "a", href: "javascript:alert(1)" } });
  assert.ok(c.texts["hero.title1"].length <= TEXT_FIELDS["hero.title1"][2]);
  assert.equal(c.announcement.href, "");
});

test("custom blocks: valid ones survive with their section, invalid ones are dropped", () => {
  const b = newBlock("cards");
  const c = normalizeContent({
    blocks: [b, { id: "bad id!", kind: "cards" }, { ...newBlock("cta"), kind: "evil" }],
    sections: [{ id: blockSectionId(b.id), visible: true }, { id: "block:doesnotexist", visible: true }],
  });
  assert.equal(c.blocks.length, 1);
  assert.ok(c.sections.some((s) => s.id === blockSectionId(b.id)));
  assert.ok(!c.sections.some((s) => s.id === "block:doesnotexist"));
  assert.ok(c.blocks[0].items.length <= 6);
});
