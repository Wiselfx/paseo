import { describe, expect, it } from "vitest";

import {
  EMPTY_POP_STATE,
  flushAll,
  isCurrent,
  nextPop,
  reconcile,
  type PopState,
} from "./pop-state";

/** Drive a stream to completion the way the hook does: pop, pop, then flush. */
function deliver(committed: readonly string[], state: PopState = EMPTY_POP_STATE): PopState {
  let current = reconcile(state, committed);
  for (let guard = 0; guard < 100; guard += 1) {
    const step = nextPop(current, committed);
    current = step.state;
    if (!step.item) return flushAll(current, committed).state;
  }
  throw new Error("pop loop did not settle");
}

describe("isCurrent", () => {
  it("holds when the message only grew", () => {
    const state = nextPop(reconcile(EMPTY_POP_STATE, ["a", "b"]), ["a", "b"]).state;
    expect(isCurrent(state, ["a", "b", "c"])).toBe(true);
  });

  it("drops when the delivered blocks were rewritten", () => {
    const blocks = ["a", "b"];
    const first = nextPop(reconcile(EMPTY_POP_STATE, blocks), blocks).state;
    const second = nextPop(first, blocks).state;
    expect(isCurrent(second, ["a", "b2"])).toBe(false);
  });

  it("drops when the message shrank", () => {
    const blocks = ["a", "b"];
    const first = nextPop(reconcile(EMPTY_POP_STATE, blocks), blocks).state;
    const second = nextPop(first, blocks).state;
    expect(second.consumed).toBe(2);
    expect(isCurrent(second, ["a"])).toBe(false);
  });
});

describe("reconcile", () => {
  it("keeps the bubbles and the generation on an append", () => {
    const first = nextPop(EMPTY_POP_STATE, ["a", "b"]).state;
    const second = reconcile(first, ["a", "b", "c"]);
    expect(second).toBe(first);
  });

  it("clears the bubbles and bumps the generation on a rewrite", () => {
    const first = nextPop(EMPTY_POP_STATE, ["a"]).state;
    const next = reconcile(first, ["zzz"]);
    expect(next.bubbles).toEqual([]);
    expect(next.consumed).toBe(0);
    expect(next.generation).toBe(1);
  });
});

describe("nextPop", () => {
  it("releases one bubble at a time", () => {
    const first = nextPop(EMPTY_POP_STATE, ["a", "b", "c"]);
    expect(first.state.bubbles).toEqual(["a"]);
    expect(first.state.consumed).toBe(1);
    const second = nextPop(first.state, ["a", "b", "c"]);
    expect(second.state.bubbles).toEqual(["a", "b"]);
    expect(second.state.consumed).toBe(2);
  });

  it("coalesces a long backlog instead of popping eight times", () => {
    const blocks = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    let state = reconcile(EMPTY_POP_STATE, blocks);
    let merged = 0;
    for (let guard = 0; guard < 10; guard += 1) {
      const step = nextPop(state, blocks);
      state = step.state;
      if (!step.item) break;
      if (step.item.blocks > 1) merged += 1;
    }
    expect(merged).toBeGreaterThan(0);
    expect(state.bubbles.length).toBeLessThan(blocks.length);
    expect(state.consumed).toBe(blocks.length);
  });

  it("returns nothing once the backlog is empty", () => {
    const state = {
      ...EMPTY_POP_STATE,
      consumed: 2,
      source: "a\u0000b",
      bubbles: ["a", "b"],
    };
    expect(nextPop(state, ["a", "b"]).item).toBeNull();
  });
});

describe("flushAll", () => {
  it("releases the tail the pops had not reached", () => {
    const blocks = ["one", "two", "three", "four"];
    const shown = nextPop(EMPTY_POP_STATE, blocks).state;
    const flushed = flushAll(shown, blocks);
    expect(flushed.item?.text).toBe("two\n\nthree\n\nfour");
    expect(flushed.state.consumed).toBe(blocks.length);
    expect(flushed.state.bubbles.join("\n\n")).toContain("four");
  });

  it("does not duplicate what is already on screen", () => {
    const blocks = ["one", "two"];
    const shown = nextPop(EMPTY_POP_STATE, blocks).state;
    const flushed = flushAll(shown, blocks);
    expect(flushed.state.bubbles).toEqual(["one", "two"]);
  });

  it("is a no-op when everything landed", () => {
    const blocks = ["one"];
    const shown = nextPop(EMPTY_POP_STATE, blocks).state;
    const flushed = flushAll(shown, blocks);
    expect(flushed.item).toBeNull();
    expect(flushed.state.consumed).toBe(1);
  });
});

describe("delivery", () => {
  it("never loses text, however the burst is paced", () => {
    const blocks = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"];
    const done = deliver(blocks);
    expect(done.consumed).toBe(blocks.length);
    const squash = (parts: readonly string[]) => parts.join("").replace(/\s+/g, "");
    expect(squash(done.bubbles)).toBe(squash(blocks));
  });

  it("recovers after the message is re-sent", () => {
    const replayed = deliver(["new answer"], reconcile(deliver(["old"]), ["new answer"]));
    expect(replayed.bubbles).toEqual(["new answer"]);
    expect(replayed.generation).toBe(1);
  });
});
