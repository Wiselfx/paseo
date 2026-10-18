import { describe, expect, it } from "vitest";
import { cacheReadout } from "./context-window-cache";

const format = (value: number): string => `${Math.round(value / 1000)}k`;

describe("cacheReadout", () => {
  it("shows the cache read and the input it compares against", () => {
    expect(cacheReadout({ cachedInputTokens: 40_000, inputTokens: 64_400 }, format)).toEqual({
      read: "40k",
      input: "64k",
    });
  });

  it("shows the cache read alone when no input was reported", () => {
    expect(cacheReadout({ cachedInputTokens: 40_000 }, format)).toEqual({
      read: "40k",
      input: null,
    });
  });

  it("shows nothing without cache reads", () => {
    expect(cacheReadout(undefined, format)).toBe(null);
    expect(cacheReadout({}, format)).toBe(null);
    expect(cacheReadout({ cachedInputTokens: 0, inputTokens: 12_000 }, format)).toBe(null);
  });

  it("ignores values that are not finite numbers", () => {
    expect(cacheReadout({ cachedInputTokens: Number.NaN }, format)).toBe(null);
    expect(cacheReadout({ cachedInputTokens: Number.POSITIVE_INFINITY }, format)).toBe(null);
    expect(cacheReadout({ cachedInputTokens: 1_000, inputTokens: Number.NaN }, format)).toEqual({
      read: "1k",
      input: null,
    });
  });
});
