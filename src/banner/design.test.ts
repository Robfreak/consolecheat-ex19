import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DESIGN,
  MAX_LINES,
  MAX_TEXT,
  STYLE_PRESETS,
  applyStyle,
  capText,
  cloneDesign,
  cycleStyle,
  matchingStyle,
  parseDesign,
  randomStyle,
} from "./design.ts";

test("style presets include Arcade, Game Boy, Synthwave and apply without touching text or size", () => {
  const names = STYLE_PRESETS.map((p) => p.de);
  for (const name of ["Arcade", "Game Boy", "Synthwave"]) assert.ok(names.includes(name), name);
  const base = { ...cloneDesign(DEFAULT_DESIGN), text: "HALLO", size: { preset: "header" as const, width: 1500, height: 500 } };
  const gb = applyStyle(base, STYLE_PRESETS[1]!.style);
  assert.equal(gb.text, "HALLO");
  assert.equal(gb.size.preset, "header");
  assert.equal(gb.background.color, "#9bbc0f");
  assert.equal(matchingStyle(gb), 1);
  for (const preset of STYLE_PRESETS) assert.ok(parseDesign(applyStyle(base, preset.style)), preset.id);
});

test("cycling styles wraps around in both directions", () => {
  const n = STYLE_PRESETS.length;
  assert.equal(cycleStyle(-1, 1), 0);
  assert.equal(cycleStyle(-1, -1), n - 1);
  assert.equal(cycleStyle(n - 1, 1), 0);
  assert.equal(cycleStyle(0, -1), n - 1);
});

test("the random style is deterministic per seed, valid, and varies", () => {
  assert.deepEqual(randomStyle(42), randomStyle(42));
  const seen = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    const style = randomStyle(seed);
    seen.add(JSON.stringify(style));
    assert.ok(parseDesign(applyStyle(cloneDesign(DEFAULT_DESIGN), style)), `seed ${seed}`);
    assert.ok(style.fill.stops.length >= 2 && style.fill.stops.length <= 3);
  }
  assert.ok(seen.size > 15);
});

test("text is capped in lines and length", () => {
  const long = "A".repeat(500);
  assert.equal(capText(long).length, MAX_TEXT);
  assert.equal(capText("1\n2\n3\n4\n5\n6\n7\n8").split("\n").length, MAX_LINES);
  assert.equal(capText("A\r\nB\tC"), "A\nB C");
});

test("parseDesign rejects wrong types and clamps numbers", () => {
  assert.deepEqual(parseDesign(cloneDesign(DEFAULT_DESIGN)), DEFAULT_DESIGN);
  assert.equal(parseDesign(null), null);
  assert.equal(parseDesign({ ...DEFAULT_DESIGN, font: "comic" }), null);
  assert.equal(parseDesign({ ...DEFAULT_DESIGN, fill: { stops: ["#fff"], direction: "v" } }), null);
  assert.equal(parseDesign({ ...DEFAULT_DESIGN, fill: { stops: ["#000000", "red"], direction: "v" } }), null);
  assert.equal(parseDesign({ ...DEFAULT_DESIGN, size: { preset: "imax", width: 1, height: 1 } }), null);
  assert.equal(parseDesign({ ...DEFAULT_DESIGN, scale: "8" }), null);
  const clamped = parseDesign({ ...DEFAULT_DESIGN, scale: 999, padding: -5, text: "X".repeat(999), outline: { width: 99, color: "#000000" } });
  assert.equal(clamped?.scale, 64);
  assert.equal(clamped?.padding, 0);
  assert.equal(clamped?.text.length, MAX_TEXT);
  assert.equal(clamped?.outline.width, 4);
});
