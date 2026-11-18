import assert from "node:assert/strict";
import test from "node:test";
import { MAX_HISTORY, canRedo, canUndo, commit, createHistory, redo, seal, undo } from "./history.ts";

test("undo and redo walk the steps; a new change clears redo", () => {
  let h = createHistory(1);
  assert.equal(canUndo(h), false);
  h = commit(h, 2);
  h = commit(h, 3);
  h = undo(h);
  assert.equal(h.present, 2);
  assert.equal(canRedo(h), true);
  h = undo(h);
  assert.equal(h.present, 1);
  assert.equal(undo(h), h, "nothing more to undo");
  h = redo(h);
  assert.equal(h.present, 2);
  h = commit(h, 9);
  assert.equal(canRedo(h), false);
  assert.deepEqual(h.past, [1, 2]);
});

test("one slider drag (same group) is one undo step until sealed", () => {
  let h = createHistory(0);
  for (let v = 1; v <= 10; v++) h = commit(h, v, "scale");
  assert.equal(h.present, 10);
  assert.deepEqual(h.past, [0]);
  h = seal(h);
  h = commit(h, 11, "scale");
  assert.deepEqual(h.past, [0, 10]);
  h = commit(h, 12, "color");
  assert.deepEqual(h.past, [0, 10, 11]);
  assert.equal(undo(undo(undo(h))).present, 0);
});

test("history is capped", () => {
  let h = createHistory(0);
  for (let v = 1; v <= MAX_HISTORY + 20; v++) h = commit(h, v);
  assert.equal(h.past.length, MAX_HISTORY);
  assert.equal(commit(h, h.present), h, "same value adds no step");
});
