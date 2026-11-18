// Keyboard shortcuts. Pure helpers so node:test can check them.

export type KeyAction = "undo" | "redo" | "prevStyle" | "nextStyle" | "random" | "export";

export type KeyLike = {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
};

/**
 * Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo, [ and ] previous/next style,
 * R random style, E export PNG. Auto-repeat only repeats undo/redo.
 */
export function keyAction(event: KeyLike): KeyAction | null {
  if (event.altKey) return null;
  const key = event.key.toLowerCase();
  const mod = Boolean(event.ctrlKey || event.metaKey);
  if (mod) {
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y") return "redo";
    return null;
  }
  if (event.repeat) return null;
  if (event.key === "[") return "prevStyle";
  if (event.key === "]") return "nextStyle";
  if (key === "r" && !event.shiftKey) return "random";
  if (key === "e" && !event.shiftKey) return "export";
  return null;
}

export type TargetLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
} | null;

const TEXT_INPUTS = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

/** Text fields, text areas, and selects keep every key: no shortcut fires while they have focus. */
export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  return false;
}

export function shortcutAllowed(target: TargetLike): boolean {
  return !isTypingTarget(target);
}
