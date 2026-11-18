import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SIZE_PRESET_IDS } from "./design.ts";
import { FONT_IDS } from "./fonts.ts";
import { copy, fill, initialLang, languageOptions } from "./messages.ts";
import { LIBRARY_KEY } from "./library.ts";

function leaves(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => leaves(inner, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

test("German is the default and English has the same keys and placeholders", () => {
  assert.equal(languageOptions[0]?.id, "de");
  assert.equal(initialLang(null), "de");
  assert.equal(initialLang("xx"), "de");
  assert.equal(initialLang("en"), "en");
  assert.deepEqual(leaves(copy.de).sort(), leaves(copy.en).sort());
  for (const key of leaves(copy.de)) {
    const de = (copy.de as Record<string, unknown>)[key];
    const en = (copy.en as Record<string, unknown>)[key];
    assert.equal(typeof de, "string", key);
    assert.ok(String(de).trim() && String(en).trim(), key);
    const holes = (s: unknown) => (String(s).match(/\{[A-Za-z0-9]+\}/g) ?? []).sort();
    assert.deepEqual(holes(de), holes(en), key);
  }
});

test("copy covers every size preset, font, import error, and names the storage key", () => {
  for (const lang of ["de", "en"] as const) {
    const t = copy[lang] as Record<string, string>;
    for (const id of SIZE_PRESET_IDS) assert.ok(t[`size_${id}`], `size_${id}`);
    for (const id of FONT_IDS) assert.ok(t[`font_${id}`], `font_${id}`);
    for (const id of ["tooLarge", "json", "schema", "empty"]) assert.ok(t[`import_${id}`], `import_${id}`);
  }
  assert.equal(copy.de.title, "Retro-Banner-Generator");
  assert.equal(copy.de.toolsHeading, "Weitere Werkzeuge");
  assert.match(copy.de.storageNote, new RegExp(LIBRARY_KEY));
  assert.match(copy.de.deleteAsk, new RegExp(LIBRARY_KEY));
  assert.match(copy.en.deleteAsk, new RegExp(LIBRARY_KEY));
  assert.match(copy.de.controls, /Options/);
  assert.match(copy.de.controls, /L1\/R1/);
  assert.match(copy.de.controls, /△/);
  assert.equal(fill(copy.de.saved, { name: "Stream" }), "Gespeichert: Stream");
});

test("the page wires aria-live, labels, rAF polling, pixelated preview, and 390px", () => {
  const ui = readFileSync(new URL("./Generator.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /role="img"/);
  assert.match(ui, /htmlFor="banner-text"/);
  assert.match(ui, /requestAnimationFrame\(poll\)/);
  assert.match(ui, /pollPad\(pad, memory\)/);
  assert.match(ui, /gamepaddisconnected/);
  assert.match(ui, /isTypingTarget\(document\.activeElement/);
  assert.match(ui, /toBlob\(/);
  assert.match(ui, /maxLength=\{MAX_TEXT\}/);
  assert.doesNotMatch(ui, /fetch\(|XMLHttpRequest|sendBeacon/);
  assert.match(styles, /image-rendering: pixelated/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /390px/);
  assert.match(styles, /:focus-visible/);
});
