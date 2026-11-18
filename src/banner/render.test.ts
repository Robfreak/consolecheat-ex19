import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DESIGN, SIZE_PRESETS, cloneDesign, exportSize, type Design } from "./design.ts";
import { fitScale, pngFileName, renderBanner } from "./render.ts";

function design(patch: Partial<Design> = {}): Design {
  return { ...cloneDesign(DEFAULT_DESIGN), ...patch };
}

const alphaAt = (out: ReturnType<typeof renderBanner>, x: number, y: number) => out.data[(y * out.width + x) * 4 + 3];

test("each size preset renders and exports at its exact size", () => {
  const expected: Record<string, [number, number]> = {
    overlay: [1920, 240],
    twitch: [1200, 480],
    youtube: [2560, 1440],
    header: [1500, 500],
    panel: [320, 100],
  };
  for (const preset of SIZE_PRESETS) {
    const d = design({ size: { preset: preset.id, width: 1, height: 1 } });
    assert.deepEqual([exportSize(d).width, exportSize(d).height], expected[preset.id], preset.id);
    const out = renderBanner(d);
    assert.equal(out.width, preset.width);
    assert.equal(out.height, preset.height);
    assert.equal(out.data.length, preset.width * preset.height * 4);
    assert.equal(pngFileName(d), `consolecheat-banner-${preset.id}-${preset.width}x${preset.height}.png`);
  }
});

test("custom size is clamped to 16–4096", () => {
  assert.deepEqual(exportSize(design({ size: { preset: "custom", width: 640, height: 200 } })), { width: 640, height: 200 });
  assert.deepEqual(exportSize(design({ size: { preset: "custom", width: 5, height: 99999 } })), { width: 16, height: 4096 });
  const out = renderBanner(design({ size: { preset: "custom", width: 64, height: 32 } }));
  assert.equal(out.width * out.height * 4, out.data.length);
});

test("a transparent background leaves alpha 0 outside the text, even with scanlines", () => {
  const d = design({
    background: { mode: "transparent", color: "#000000", color2: "#000000", direction: "v" },
    scanlines: 60,
    size: { preset: "panel", width: 320, height: 100 },
  });
  const out = renderBanner(d);
  assert.equal(alphaAt(out, 0, 0), 0);
  assert.equal(alphaAt(out, 319, 99), 0);
  let opaque = 0;
  let clear = 0;
  for (let i = 3; i < out.data.length; i += 4) {
    if (out.data[i] === 255) opaque++;
    else if (out.data[i] === 0) clear++;
    else assert.fail(`partial alpha ${out.data[i]}`);
  }
  assert.ok(opaque > 0, "text is drawn");
  assert.ok(clear > opaque, "most pixels stay transparent");
});

test("a colour background is fully opaque and scanlines darken odd bands", () => {
  const d = design({ text: "", scanlines: 50, background: { mode: "color", color: "#808080", color2: "#000000", direction: "v" }, size: { preset: "panel", width: 320, height: 100 } });
  const out = renderBanner(d);
  for (let i = 3; i < out.data.length; i += 4) assert.equal(out.data[i], 255);
  assert.equal(out.data[0], 128);
  assert.equal(out.data[(1 * 320) * 4], 64, "row 1 is a dark band at scale 1");
});

test("the gradient background runs from colour 1 to colour 2", () => {
  const d = design({ text: "", scanlines: 0, background: { mode: "gradient", color: "#000000", color2: "#ffffff", direction: "h" }, size: { preset: "panel", width: 320, height: 100 } });
  const out = renderBanner(d);
  assert.equal(out.data[0], 0);
  assert.equal(out.data[319 * 4], 255);
});

test("auto scale fits the text inside the padding; manual scale wraps", () => {
  assert.equal(fitScale(10, 7, 100, 70), 10);
  assert.equal(fitScale(10, 7, 5, 5), 1);
  assert.equal(fitScale(0, 0, 100, 100), 1);
  const auto = renderBanner(design({ text: "HI", outline: { width: 0, color: "#000000" }, shadow: { on: false, dx: 0, dy: 0, color: "#000000" }, padding: 10, size: { preset: "panel", width: 320, height: 100 } }));
  // "HI" = 11 × 7 font pixels in 300 × 80: scale = min(27, 11) = 11.
  assert.equal(auto.scale, 11);
  assert.equal(auto.clipped, false);
  const manual = renderBanner(design({ text: "GAME OVER", scale: 8, padding: 0, outline: { width: 0, color: "#000000" }, shadow: { on: false, dx: 0, dy: 0, color: "#000000" }, size: { preset: "panel", width: 320, height: 100 } }));
  assert.deepEqual(manual.lines, ["GAME", "OVER"]);
});

test("outline and shadow colours appear where the math says", () => {
  const d = design({
    text: "I",
    scale: 10,
    padding: 0,
    align: "left",
    scanlines: 0,
    fill: { stops: ["#ffffff", "#ffffff"], direction: "v" },
    outline: { width: 1, color: "#ff0000" },
    shadow: { on: true, dx: 1, dy: 1, color: "#0000ff" },
    background: { mode: "transparent", color: "#000000", color2: "#000000", direction: "v" },
    size: { preset: "custom", width: 100, height: 100 },
  });
  const out = renderBanner(d);
  // Art is (5 + 2 + 1) × (7 + 2 + 1) cells = 80 × 100 px, so it starts at x = 0, y = 0.
  const px = (cx: number, cy: number) => Array.from(out.data.slice(((cy * 10 + 5) * 100 + cx * 10 + 5) * 4, ((cy * 10 + 5) * 100 + cx * 10 + 5) * 4 + 4));
  assert.deepEqual(px(0, 0), [0, 0, 0, 0], "corner outside the ring");
  assert.deepEqual(px(1, 0), [255, 0, 0, 255], "outline above the I");
  assert.deepEqual(px(2, 1), [255, 255, 255, 255], "text");
  assert.deepEqual(px(6, 9), [0, 0, 255, 255], "shadow bottom right");
  assert.deepEqual(px(7, 9), [0, 0, 0, 0], "outside the shadow");
});
