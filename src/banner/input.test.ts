import assert from "node:assert/strict";
import test from "node:test";
import { isTypingTarget, keyAction, shortcutAllowed } from "./input.ts";

test("keyboard shortcuts map to undo, redo, styles, random, export", () => {
  assert.equal(keyAction({ key: "z", ctrlKey: true }), "undo");
  assert.equal(keyAction({ key: "z", metaKey: true }), "undo");
  assert.equal(keyAction({ key: "Z", ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(keyAction({ key: "y", ctrlKey: true }), "redo");
  assert.equal(keyAction({ key: "[" }), "prevStyle");
  assert.equal(keyAction({ key: "]" }), "nextStyle");
  assert.equal(keyAction({ key: "r" }), "random");
  assert.equal(keyAction({ key: "e" }), "export");
  assert.equal(keyAction({ key: "e", repeat: true }), null, "auto-repeat does not export twice");
  assert.equal(keyAction({ key: "r", altKey: true }), null);
  assert.equal(keyAction({ key: "c", ctrlKey: true }), null, "copy stays with the browser");
  assert.equal(keyAction({ key: "x" }), null);
});

test("no shortcut while a text field, text area, or select has focus", () => {
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "number" }), true);
  assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  for (const action of ["undo", "redo", "prevStyle", "nextStyle", "random", "export"] as const) {
    assert.equal(shortcutAllowed({ tagName: "TEXTAREA" }, action), false, action);
    assert.equal(shortcutAllowed({ tagName: "INPUT", type: "text" }, action), false, action);
    assert.equal(shortcutAllowed({ tagName: "INPUT", type: "color" }, action), true, action);
    assert.equal(shortcutAllowed({ tagName: "BUTTON" }, action), true, action);
    assert.equal(shortcutAllowed(null, action), true, action);
  }
});

test("a focused range slider blocks R, E, [ and ] but keeps undo and redo", () => {
  const range = { tagName: "INPUT", type: "range" };
  assert.equal(isTypingTarget(range), false);
  const allowed = (event: Parameters<typeof keyAction>[0]) => {
    const action = keyAction(event);
    return action !== null && shortcutAllowed(range, action);
  };
  assert.equal(allowed({ key: "r" }), false, "R");
  assert.equal(allowed({ key: "R" }), false, "R (caps)");
  assert.equal(allowed({ key: "e" }), false, "E");
  assert.equal(allowed({ key: "[" }), false, "[");
  assert.equal(allowed({ key: "]" }), false, "]");
  assert.equal(allowed({ key: "z", ctrlKey: true }), true, "Ctrl+Z");
  assert.equal(allowed({ key: "z", metaKey: true }), true, "⌘+Z");
  assert.equal(allowed({ key: "y", ctrlKey: true }), true, "Ctrl+Y");
  assert.equal(allowed({ key: "y", metaKey: true }), true, "⌘+Y");
  assert.equal(allowed({ key: "Z", ctrlKey: true, shiftKey: true }), true, "Ctrl+Shift+Z");
  assert.equal(allowed({ key: "Z", metaKey: true, shiftKey: true }), true, "⌘+Shift+Z");
  // Arrow keys, Home/End and Page keys map to no action, so the slider handles them natively.
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]) {
    assert.equal(keyAction({ key }), null, key);
  }
});
