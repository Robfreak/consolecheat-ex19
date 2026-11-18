import assert from "node:assert/strict";
import test from "node:test";
import { dilate, effectMargins, gradientColor, gradientT, lerpColor, outlineMask, scanlineBand, scanlineFactor, shiftMask } from "./effects.ts";

test("gradients interpolate 2 and 3 stops", () => {
  assert.deepEqual(lerpColor([0, 0, 0], [255, 255, 255], 0.5), [128, 128, 128]);
  assert.deepEqual(gradientColor(["#000000", "#ffffff"], 0), [0, 0, 0]);
  assert.deepEqual(gradientColor(["#000000", "#ffffff"], 1), [255, 255, 255]);
  assert.deepEqual(gradientColor(["#ff0000", "#00ff00", "#0000ff"], 0.5), [0, 255, 0]);
  assert.deepEqual(gradientColor(["#ff0000", "#00ff00", "#0000ff"], 0.25), [128, 128, 0]);
  assert.deepEqual(gradientColor(["#ff0000", "#00ff00", "#0000ff"], 1), [0, 0, 255]);
  assert.deepEqual(gradientColor(["#ff0000", "#0000ff"], 2), [0, 0, 255], "clamped");
  assert.equal(gradientT(0, 5), 0);
  assert.equal(gradientT(4, 5), 1);
  assert.equal(gradientT(0, 1), 0);
});

test("outline is the square ring around the text, width r", () => {
  // 5×5 grid with one centre pixel.
  const mask = new Uint8Array(25);
  mask[12] = 1;
  const ring = outlineMask(mask, 5, 5, 1);
  assert.equal(ring.reduce((a, b) => a + b, 0), 8);
  assert.equal(ring[12], 0);
  assert.equal(dilate(mask, 5, 5, 2).reduce((a, b) => a + b, 0), 25);
  assert.deepEqual(dilate(mask, 5, 5, 0), mask);
});

test("shadow shifts the mask and drops what moves outside", () => {
  const mask = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 1]);
  const moved = shiftMask(mask, 3, 3, 1, 1);
  assert.deepEqual(Array.from(moved), [0, 0, 0, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(effectMargins(2, { on: true, dx: 3, dy: -1 }), { left: 2, right: 5, top: 3, bottom: 2 });
  assert.deepEqual(effectMargins(0, { on: false, dx: 3, dy: 3 }), { left: 0, right: 0, top: 0, bottom: 0 });
});

test("scanlines darken every second band by the intensity", () => {
  assert.equal(scanlineBand(1), 1);
  assert.equal(scanlineBand(8), 4);
  assert.equal(scanlineFactor(0, 2, 50), 1);
  assert.equal(scanlineFactor(2, 2, 50), 0.5);
  assert.equal(scanlineFactor(3, 2, 50), 0.5);
  assert.equal(scanlineFactor(4, 2, 50), 1);
  assert.equal(scanlineFactor(2, 2, 0), 1);
});
