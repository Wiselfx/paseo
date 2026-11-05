import { describe, expect, it } from "vitest";

import { planPops, POP_ALWAYS_SEPARATE, POP_COALESCE_THRESHOLD } from "./pop-queue";

describe("planPops", () => {
  it("pops one bubble per block while the backlog is short", () => {
    expect(planPops(["a", "b"])).toEqual([
      { text: "a", blocks: 1 },
      { text: "b", blocks: 1 },
    ]);
  });

  it("keeps the first bubbles separate and merges the rest past the threshold", () => {
    const pending = ["a", "b", "c", "d", "e"];
    const plan = planPops(pending);
    expect(plan).toHaveLength(POP_ALWAYS_SEPARATE + 1);
    expect(plan.at(-1)).toEqual({ text: "c\n\nd\n\ne", blocks: 3 });
  });

  it("does not merge at the threshold itself", () => {
    const pending = Array.from({ length: POP_COALESCE_THRESHOLD }, (_, index) => `p${index}`);
    expect(planPops(pending).every((item) => item.blocks === 1)).toBe(true);
  });

  it("accounts for every block it was given, so nothing is dropped", () => {
    const total = planPops(["a", "b", "c", "d", "e", "f"]).reduce(
      (sum, item) => sum + item.blocks,
      0,
    );
    expect(total).toBe(6);
  });

  it("ignores blank blocks", () => {
    expect(planPops(["  ", "a", ""])).toEqual([{ text: "a", blocks: 1 }]);
  });

  it("returns nothing when there is nothing to pop", () => {
    expect(planPops([])).toEqual([]);
  });
});
