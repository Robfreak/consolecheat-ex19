import assert from "node:assert/strict";
import test from "node:test";
import { FONTS, FONT_IDS, REQUIRED_CHARS, emboldenGlyph, glyphFor, hasGlyph } from "./fonts.ts";

test("every font covers A–Z, 0–9, ÄÖÜß and the punctuation set", () => {
  assert.ok(FONT_IDS.length >= 2);
  for (const id of FONT_IDS) {
    const font = FONTS[id];
    for (const ch of REQUIRED_CHARS) assert.ok(font.glyphs[ch], `${id} misses ${JSON.stringify(ch)}`);
  }
});

test("glyphs are rectangular, use only # and ., and match the font height", () => {
  for (const id of FONT_IDS) {
    const font = FONTS[id];
    for (const [ch, glyph] of Object.entries(font.glyphs)) {
      assert.equal(glyph.rows.length, font.height, `${id} ${ch} height`);
      for (const row of glyph.rows) {
        assert.equal(row.length, glyph.width, `${id} ${ch} width`);
        assert.match(row, /^[#.]+$/, `${id} ${ch}`);
      }
      if (ch !== " ") assert.ok(glyph.rows.some((row) => row.includes("#")), `${id} ${ch} is empty`);
    }
  }
});

test("letters and digits have distinct glyphs within a font", () => {
  for (const id of FONT_IDS) {
    const seen = new Map<string, string>();
    for (const ch of [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÄÖÜß"]) {
      const key = FONTS[id].glyphs[ch]?.rows.join("/") ?? "";
      assert.equal(seen.get(key), undefined, `${id}: ${ch} looks like ${seen.get(key)}`);
      seen.set(key, ch);
    }
  }
});

test("lowercase uses the uppercase glyph, ß its own, unknown characters show ?", () => {
  const font = FONTS.pixel;
  assert.equal(glyphFor(font, "a"), font.glyphs.A);
  assert.equal(glyphFor(font, "ä"), font.glyphs.Ä);
  assert.equal(glyphFor(font, "ß"), font.glyphs.ß);
  assert.equal(glyphFor(font, "€"), font.glyphs["?"]);
  assert.equal(hasGlyph(font, "ü"), true);
  assert.equal(hasGlyph(font, "€"), false);
});

test("the bold font is the 5×7 font with strokes doubled to the right", () => {
  assert.deepEqual(emboldenGlyph({ width: 3, rows: ["#..", ".#."] }), { width: 4, rows: ["##..", ".##."] });
  assert.equal(FONTS.bold.glyphs.I?.width, (FONTS.pixel.glyphs.I?.width ?? 0) + 1);
  assert.equal(FONTS.bold.height, 7);
});
