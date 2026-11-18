import assert from "node:assert/strict";
import test from "node:test";
import { BUTTON_ACTIONS, edgeActions, firstPad, pollPad, readButtons, type PadLike, type PadMemory } from "./gamepad.ts";

function pad(pressed: number[], extra: { index?: number; id?: string; axes?: number[] } = {}): PadLike {
  return {
    connected: true,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
    axes: extra.axes ?? [0, 0, 0, 0],
    ...({ index: extra.index ?? 0, id: extra.id ?? "pad" } as object),
  };
}

test("mapping: D-pad left/right and L1/R1 cycle styles, up/down fonts, △ random, Options export", () => {
  assert.equal(BUTTON_ACTIONS[14], "prevStyle");
  assert.equal(BUTTON_ACTIONS[15], "nextStyle");
  assert.equal(BUTTON_ACTIONS[4], "prevStyle");
  assert.equal(BUTTON_ACTIONS[5], "nextStyle");
  assert.equal(BUTTON_ACTIONS[12], "prevFont");
  assert.equal(BUTTON_ACTIONS[13], "nextFont");
  assert.equal(BUTTON_ACTIONS[3], "random");
  assert.equal(BUTTON_ACTIONS[9], "export");
  assert.deepEqual(edgeActions(readButtons(pad([])), readButtons(pad([5, 9]))), ["nextStyle", "export"]);
});

test("the first poll only records the buttons: a held button does not fire", () => {
  const first = pollPad(pad([3, 9]), null);
  assert.deepEqual(first.actions, []);
  assert.ok(first.memory);
  const still = pollPad(pad([3, 9]), first.memory);
  assert.deepEqual(still.actions, [], "still held");
  const released = pollPad(pad([]), still.memory);
  assert.deepEqual(released.actions, []);
  const pressed = pollPad(pad([3]), released.memory);
  assert.deepEqual(pressed.actions, ["random"], "a fresh press fires once");
  assert.deepEqual(pollPad(pad([3]), pressed.memory).actions, []);
});

test("after a disconnect or with a different pad, the first poll seeds again", () => {
  let memory: PadMemory | null = pollPad(pad([]), null).memory;
  memory = pollPad(null, memory).memory;
  assert.equal(memory, null, "no pad clears the memory");
  const reconnect = pollPad(pad([9]), memory);
  assert.deepEqual(reconnect.actions, [], "Options held while reconnecting does not export");
  const other = pollPad(pad([4], { index: 1, id: "other" }), reconnect.memory);
  assert.deepEqual(other.actions, [], "a different pad seeds first");
  assert.deepEqual(pollPad(pad([4, 5], { index: 1, id: "other" }), other.memory).actions, ["nextStyle"]);
});

test("the left stick counts as D-pad beyond the dead zone; firstPad skips empty slots", () => {
  assert.equal(readButtons(pad([], { axes: [0.4, 0] }))[15], false);
  assert.equal(readButtons(pad([], { axes: [0.9, 0] }))[15], true);
  assert.equal(firstPad([null, pad([], { index: 1 })])?.buttons.length, 17);
  assert.equal(firstPad(null), null);
});
