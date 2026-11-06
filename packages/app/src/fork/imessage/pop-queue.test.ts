import { describe, expect, it } from "vitest";

import { nextBubble, POP_COALESCE_THRESHOLD } from "./pop-queue";

/** Drain a backlog the way the hook does, so the whole burst can be asserted. */
function drain(pending: readonly string[]) {
  const bubbles: string[] = [];
  let consumed = 0;
  let burstOpen = false;
  for (let guard = 0; guard < 50; guard += 1) {
    const step = nextBubble({ pending: pending.slice(consumed), burstOpen });
    if (!step) break;
    bubbles.push(step.item.text);
    consumed += step.item.blocks;
    burstOpen = step.burstOpen;
  }
  return bubbles;
}

describe("nextBubble", () => {
  it("pops one bubble per block while the backlog is short", () => {
    const first = nextBubble({ pending: ["a", "b"], burstOpen: false });
    expect(first).toEqual({ item: { text: "a", blocks: 1 }, burstOpen: false });
  });

  it("opens a burst when the backlog is over the threshold", () => {
    const pending = ["a", "b", "c", "d", "e"];
    const first = nextBubble({ pending, burstOpen: false });
    expect(first?.item).toEqual({ text: "a", blocks: 1 });
    expect(first?.burstOpen).toBe(true);

    const second = nextBubble({ pending: pending.slice(1), burstOpen: true });
    expect(second?.item).toEqual({ text: "b\n\nc\n\nd\n\ne", blocks: 4 });
    expect(second?.burstOpen).toBe(false);
  });

  it("does not open a burst at the threshold itself", () => {
    const pending = Array.from({ length: POP_COALESCE_THRESHOLD }, (_, index) => `p${index}`);
    expect(nextBubble({ pending, burstOpen: false })?.burstOpen).toBe(false);
  });

  it("accounts for every block, so nothing is dropped", () => {
    const pending = ["a", "b", "c", "d", "e", "f", "g"];
    const delivered = drain(pending);
    expect(delivered.join("\n\n").replace(/\s+/g, "")).toBe(pending.join("").replace(/\s+/g, ""));
  });

  it("ignores blank blocks", () => {
    expect(nextBubble({ pending: ["  ", "a", ""], burstOpen: false })?.item).toEqual({
      text: "a",
      blocks: 1,
    });
  });

  it("returns nothing when there is nothing to pop", () => {
    expect(nextBubble({ pending: [], burstOpen: false })).toBeNull();
  });
});
