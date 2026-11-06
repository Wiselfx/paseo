import { describe, expect, it } from "vitest";

import { bubblePath, TAIL_BOX } from "./shape";

/** All y coordinates in a path, so the tail's hang can be asserted. */
function ys(path: string): number[] {
  return [...path.matchAll(/[-\d.]+,([-\d.]+)/g)].map((match) => Number(match[1]));
}

describe("bubblePath", () => {
  it("closes the outline", () => {
    expect(bubblePath(200, 40, "left").endsWith("Z")).toBe(true);
    expect(bubblePath(200, 40, "right").endsWith("Z")).toBe(true);
    expect(bubblePath(200, 40, "none").endsWith("Z")).toBe(true);
  });

  it("hangs the tail below the body only when there is one", () => {
    const height = 40;
    expect(Math.max(...ys(bubblePath(200, height, "none")))).toBeCloseTo(height, 1);
    expect(Math.max(...ys(bubblePath(200, height, "left")))).toBeGreaterThan(
      height + TAIL_BOX.hang - 1,
    );
    expect(Math.max(...ys(bubblePath(200, height, "right")))).toBeGreaterThan(
      height + TAIL_BOX.hang - 1,
    );
  });

  it("mirrors the tail to the side that is speaking", () => {
    const width = 200;
    const left = ys(bubblePath(width, 40, "left"));
    const right = ys(bubblePath(width, 40, "right"));
    // Same silhouette, so the same vertical profile on both sides.
    expect(left.length).toBe(right.length);
  });

  it("clamps the corner radius on a bubble shorter than it", () => {
    // A 12pt-tall bubble cannot carry 20pt corners without self-intersecting.
    expect(bubblePath(120, 12, "none")).toContain("A6,6");
  });
});
