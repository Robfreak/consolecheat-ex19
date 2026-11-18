import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DESIGN, cloneDesign } from "./design.ts";
import {
  LANG_KEY,
  LIBRARY_KEY,
  MAX_DESIGNS,
  THEME_KEY,
  exportJson,
  loadLibrary,
  mergeImport,
  parseImport,
  parseLibrary,
  removeDesign,
  resetLibrary,
  saveLibrary,
  serializeLibrary,
  upsertDesign,
  type StorageLike,
} from "./library.ts";

function memory(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const d = () => cloneDesign(DEFAULT_DESIGN);

test("the key is consolecheat-banner-v1 and a save round-trips with schema and version", () => {
  assert.equal(LIBRARY_KEY, "consolecheat-banner-v1");
  const store = memory();
  const designs = upsertDesign([], "Stream", { ...d(), text: "LIVE" }, 1000);
  assert.equal(saveLibrary(store, { current: d(), designs }), true);
  const raw = JSON.parse(store.data.get(LIBRARY_KEY) ?? "{}");
  assert.equal(raw.schema, "consolecheat-banner");
  assert.equal(raw.version, 1);
  const loaded = loadLibrary(store);
  assert.equal(loaded.corrupt, false);
  assert.equal(loaded.library.designs[0]?.name, "Stream");
  assert.equal(loaded.library.designs[0]?.design.text, "LIVE");
});

test("missing, corrupt, foreign, or other-version data falls back to the default design", () => {
  assert.deepEqual(parseLibrary(null), { library: { current: d(), designs: [] }, corrupt: false });
  for (const raw of ["{not json", "[]", "42", '{"schema":"other","version":1}', '{"schema":"consolecheat-banner","version":2}']) {
    const result = parseLibrary(raw);
    assert.equal(result.corrupt, true, raw);
    assert.deepEqual(result.library.current, d(), raw);
    assert.deepEqual(result.library.designs, [], raw);
  }
  const mixed = JSON.stringify({
    schema: "consolecheat-banner",
    version: 1,
    current: { ...d(), font: "nope" },
    designs: [{ name: "Gut", savedAt: 1, design: d() }, { name: "Kaputt", savedAt: 1, design: { text: 5 } }, null],
  });
  const result = parseLibrary(mixed);
  assert.equal(result.corrupt, true);
  assert.deepEqual(result.library.current, d());
  assert.deepEqual(result.library.designs.map((x) => x.name), ["Gut"]);
  const throwing: StorageLike = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(loadLibrary(throwing).corrupt, false);
  assert.equal(saveLibrary(throwing, { current: d(), designs: [] }), false);
  assert.equal(resetLibrary(throwing), false);
});

test("reset removes only consolecheat-banner-v1", () => {
  const store = memory({
    [LIBRARY_KEY]: serializeLibrary({ current: d(), designs: [] }),
    [LANG_KEY]: "en",
    [THEME_KEY]: "light",
    "consolecheat-mash-v1": "{}",
    "consolecheat-bingo-v1": "{}",
  });
  assert.equal(resetLibrary(store), true);
  assert.equal(store.data.has(LIBRARY_KEY), false);
  assert.deepEqual([...store.data.keys()].sort(), ["consolecheat-bingo-v1", "consolecheat-lang", "consolecheat-mash-v1", "consolecheat-theme"]);
});

test("named designs: same name overwrites, newest first, capped, removable", () => {
  let list = upsertDesign([], "A", d(), 1);
  list = upsertDesign(list, "B", d(), 2);
  list = upsertDesign(list, "a", { ...d(), text: "NEU" }, 3);
  assert.deepEqual(list.map((x) => x.name), ["a", "B"]);
  assert.equal(list[0]?.design.text, "NEU");
  assert.deepEqual(upsertDesign(list, "   ", d(), 4), list);
  assert.deepEqual(removeDesign(list, "b").map((x) => x.name), ["a"]);
  for (let i = 0; i < MAX_DESIGNS + 5; i++) list = upsertDesign(list, `D${i}`, d(), i);
  assert.equal(list.length, MAX_DESIGNS);
});

test("JSON import validates schema, version, and every design", () => {
  const designs = upsertDesign(upsertDesign([], "Eins", d(), 1), "Zwei", d(), 2);
  const ok = parseImport(exportJson(designs));
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.designs.length, 2);
    assert.equal(ok.skipped, 0);
  }
  assert.deepEqual(parseImport("nope"), { ok: false, error: "json" });
  assert.deepEqual(parseImport("[]"), { ok: false, error: "schema" });
  assert.deepEqual(parseImport('{"schema":"consolecheat-banner","version":9,"designs":[]}'), { ok: false, error: "schema" });
  assert.deepEqual(parseImport('{"schema":"consolecheat-mash","version":1,"designs":[]}'), { ok: false, error: "schema" });
  assert.deepEqual(parseImport('{"schema":"consolecheat-banner","version":1,"designs":[{"name":"x"}]}'), { ok: false, error: "empty" });
  assert.deepEqual(parseImport(" ".repeat(1_000_001)), { ok: false, error: "tooLarge" });
  const partial = parseImport(JSON.stringify({ schema: "consolecheat-banner", version: 1, designs: [...designs, { name: "", savedAt: 1, design: d() }] }));
  assert.equal(partial.ok && partial.skipped, 1);
  const merged = mergeImport(upsertDesign([], "eins", { ...d(), text: "ALT" }, 0), designs);
  assert.deepEqual(merged.map((x) => x.name).sort(), ["Eins", "Zwei"]);
  assert.equal(merged.find((x) => x.name === "Eins")?.design.text, DEFAULT_DESIGN.text);
});
