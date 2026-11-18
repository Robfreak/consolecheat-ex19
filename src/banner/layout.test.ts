import assert from "node:assert/strict";
import test from "node:test";
import { FONTS } from "./fonts.ts";
import { blockHeight, layoutText, lineWidth, wrapText } from "./layout.ts";

const pixel = FONTS.pixel;
const mini = FONTS.mini;

test("line width adds glyph widths and the spacing between characters", () => {
  assert.equal(lineWidth(pixel, "", 1), 0);
  assert.equal(lineWidth(pixel, "A", 1), 5);
  assert.equal(lineWidth(pixel, "AB", 1), 11);
  assert.equal(lineWidth(pixel, "AB", 0), 10);
  assert.equal(lineWidth(pixel, "A B", 2), 5 + 3 + 5 + 2 * 2);
  assert.equal(lineWidth(pixel, "A.", 1), 5 + 1 + 1);
  assert.equal(lineWidth(mini, "HI", 1), 7);
});

test("block height is lines times glyph height plus line spacing", () => {
  assert.equal(blockHeight(pixel, 0, 2), 0);
  assert.equal(blockHeight(pixel, 1, 2), 7);
  assert.equal(blockHeight(pixel, 3, 2), 3 * 7 + 2 * 2);
  assert.equal(blockHeight(mini, 2, 1), 11);
});

test("layout size and mask follow the math and alignment", () => {
  const layout = layoutText(pixel, "AB\nI", { letterSpacing: 1, lineSpacing: 2, align: "center" });
  assert.equal(layout.width, 11);
  assert.equal(layout.height, 16);
  assert.deepEqual(layout.lineWidths, [11, 5]);
  assert.equal(layout.mask.length, 11 * 16);
  // "I" (.###.) is centred: starts at x = 3, top row on y = 9.
  const row = Array.from(layout.mask.slice(9 * 11, 10 * 11)).join("");
  assert.equal(row, "00001110000");
  const right = layoutText(pixel, "AB\nI", { letterSpacing: 1, lineSpacing: 2, align: "right" });
  assert.equal(Array.from(right.mask.slice(9 * 11, 10 * 11)).join(""), "00000001110");
  const empty = layoutText(pixel, "", { letterSpacing: 1, lineSpacing: 2, align: "left" });
  assert.equal(empty.width, 0);
});

test("word wrap keeps manual breaks, wraps at spaces, and splits long words", () => {
  assert.deepEqual(wrapText(pixel, "AB CD", 1), ["AB CD"]);
  assert.deepEqual(wrapText(pixel, "AB CD", 1, 11), ["AB", "CD"]);
  assert.deepEqual(wrapText(pixel, "AB\nCD", 1, 100), ["AB", "CD"]);
  assert.deepEqual(wrapText(pixel, "ABCD", 1, 11), ["AB", "CD"]);
  for (const line of wrapText(pixel, "GAME OVER CONTINUE", 1, 30)) assert.ok(lineWidth(pixel, line, 1) <= 30, line);
});
