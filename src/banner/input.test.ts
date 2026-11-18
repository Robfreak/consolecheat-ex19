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
  assert.equal(shortcutAllowed({ tagName: "TEXTAREA" }), false);
  assert.equal(shortcutAllowed({ tagName: "INPUT", type: "range" }), true);
  assert.equal(shortcutAllowed({ tagName: "INPUT", type: "color" }), true);
  assert.equal(shortcutAllowed({ tagName: "BUTTON" }), true);
  assert.equal(shortcutAllowed(null), true);
});
