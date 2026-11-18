// Undo/redo for designs. Consecutive changes with the same group (one slider drag,
// one typing burst) merge into one step until `seal()` is called.

export const MAX_HISTORY = 100;

export type History<T> = { past: T[]; present: T; future: T[]; group: string | null };

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], group: null };
}

export function commit<T>(h: History<T>, next: T, group: string | null = null): History<T> {
  if (Object.is(next, h.present)) return h;
  if (group !== null && group === h.group) return { ...h, present: next, future: [] };
  return { past: [...h.past, h.present].slice(-MAX_HISTORY), present: next, future: [], group };
}

/** Ends the current group, so the next change starts a new undo step. */
export function seal<T>(h: History<T>): History<T> {
  return h.group === null ? h : { ...h, group: null };
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past[h.past.length - 1];
  if (prev === undefined) return h;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], group: null };
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[0];
  if (next === undefined) return h;
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1), group: null };
}

export const canUndo = <T,>(h: History<T>) => h.past.length > 0;
export const canRedo = <T,>(h: History<T>) => h.future.length > 0;
