import { describe, expect, it } from "vitest";
import {
  createActivePromptPublisher,
  isOutlineNeighborhood,
  shouldAcceptPromptIndexEpoch,
  resolveActivePromptSeq,
  OUTLINE_NEIGHBORHOOD_RADIUS,
  type ChatOutlinePrompt,
} from "./model";

describe("chat outline prompt index epoch", () => {
  it("accepts only the authoritative timeline epoch", () => {
    expect(shouldAcceptPromptIndexEpoch("epoch-2", "epoch-2")).toBe(true);
    expect(shouldAcceptPromptIndexEpoch("epoch-2", "epoch-1")).toBe(false);
  });
});

function prompt(seq: number): ChatOutlinePrompt {
  return { seq, timestamp: new Date(seq).toISOString(), preview: `prompt ${seq}` };
}

describe("isOutlineNeighborhood", () => {
  it("covers the ticks beside the pointer and stops at the radius", () => {
    expect(isOutlineNeighborhood(0)).toBe(true);
    expect(isOutlineNeighborhood(OUTLINE_NEIGHBORHOOD_RADIUS - 1)).toBe(true);
    expect(isOutlineNeighborhood(OUTLINE_NEIGHBORHOOD_RADIUS)).toBe(false);
    expect(isOutlineNeighborhood(OUTLINE_NEIGHBORHOOD_RADIUS + 10)).toBe(false);
  });

  it("is symmetric around the pointer", () => {
    const above = [0, 1, 2, 3].map((distance) => isOutlineNeighborhood(distance));
    const below = [0, -1, -2, -3].map((distance) => isOutlineNeighborhood(distance));

    expect(above).toEqual(below);
  });
});

describe("resolveActivePromptSeq", () => {
  const prompts = [prompt(2), prompt(9), prompt(20)];

  it("marks the prompt whose turn the reading position sits in", () => {
    expect(resolveActivePromptSeq(prompts, 9)).toBe(9);
    expect(resolveActivePromptSeq(prompts, 14)).toBe(9);
    expect(resolveActivePromptSeq(prompts, 20)).toBe(20);
    expect(resolveActivePromptSeq(prompts, 99)).toBe(20);
  });

  it("marks nothing above the first prompt or without a reading position", () => {
    expect(resolveActivePromptSeq(prompts, 1)).toBeNull();
    expect(resolveActivePromptSeq(prompts, null)).toBeNull();
    expect(resolveActivePromptSeq([], 42)).toBeNull();
  });
});

describe("createActivePromptPublisher", () => {
  it("notifies subscribers only when the active prompt changes", () => {
    const publisher = createActivePromptPublisher();
    let notifications = 0;
    const unsubscribe = publisher.subscribe(() => {
      notifications += 1;
    });

    publisher.publish(9);
    publisher.publish(9);
    publisher.publish(20);
    unsubscribe();
    publisher.publish(null);

    expect(notifications).toBe(2);
    expect(publisher.getActiveSeq()).toBeNull();
  });
});
