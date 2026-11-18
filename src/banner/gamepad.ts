// Gamepad input, polled once per animation frame. Pure helpers so they can be tested with mocks.
// Same pollPad pattern as consolecheat-ex15 (src/chiptune/gamepad.ts).
// Standard mapping: 3 = Triangle/Y, 4 = L1, 5 = R1, 9 = Options/Start, 12–15 = D-pad up/down/left/right.

export const DEADZONE = 0.5;

export type PadAction = "prevStyle" | "nextStyle" | "prevFont" | "nextFont" | "random" | "export";

/** D-pad left/right and L1/R1 cycle the style presets, up/down the font, △ random style, Options exports the PNG. */
export const BUTTON_ACTIONS: Record<number, PadAction> = {
  3: "random",
  4: "prevStyle",
  5: "nextStyle",
  9: "export",
  12: "prevFont",
  13: "nextFont",
  14: "prevStyle",
  15: "nextStyle",
};

export type PadLike = {
  connected?: boolean;
  buttons: readonly { pressed: boolean; value?: number }[];
  axes: readonly number[];
};

/** Pressed state of buttons 0–15. The left stick counts as the D-pad beyond the dead zone. */
export function readButtons(pad: PadLike): boolean[] {
  const out = Array.from({ length: 16 }, (_, i) => {
    const button = pad.buttons[i];
    return !!button && (button.pressed || (button.value ?? 0) > 0.5);
  });
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  if (y < -DEADZONE) out[12] = true;
  if (y > DEADZONE) out[13] = true;
  if (x < -DEADZONE) out[14] = true;
  if (x > DEADZONE) out[15] = true;
  return out;
}

/** Buttons that went from released to pressed since the last frame. */
export function risingEdges(prev: readonly boolean[], next: readonly boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < next.length; i += 1) if (next[i] && !prev[i]) out.push(i);
  return out;
}

export function edgeActions(prev: readonly boolean[], next: readonly boolean[]): PadAction[] {
  return risingEdges(prev, next)
    .map((index) => BUTTON_ACTIONS[index])
    .filter((action): action is PadAction => action !== undefined);
}

/** The first connected pad from navigator.getGamepads(), or null. */
export function firstPad(pads: readonly (PadLike | null)[] | null | undefined): PadLike | null {
  if (!pads) return null;
  for (const pad of pads) if (pad && pad.connected !== false) return pad;
  return null;
}

/** What the previous poll saw: which pad, and which buttons were down. */
export type PadMemory = { key: string; buttons: boolean[] };

function padKey(pad: PadLike): string {
  const meta = pad as PadLike & { id?: string; index?: number };
  return `${meta.index ?? 0}:${meta.id ?? ""}`;
}

/**
 * One poll. The first poll of a pad (no memory, after a disconnect, or a different pad)
 * only records the button state and emits nothing, so a button that is already held
 * when the pad connects or the page loads does not fire. No pad clears the memory.
 */
export function pollPad(pad: PadLike | null, memory: PadMemory | null): { actions: PadAction[]; memory: PadMemory | null } {
  if (!pad) return { actions: [], memory: null };
  const next: PadMemory = { key: padKey(pad), buttons: readButtons(pad) };
  if (!memory || memory.key !== next.key) return { actions: [], memory: next };
  return { actions: edgeActions(memory.buttons, next.buttons), memory: next };
}
