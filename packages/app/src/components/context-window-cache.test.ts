import { describe, expect, it } from "vitest";
import {
  cacheHitRates,
  cacheModelCosts,
  cacheReadout,
  cacheWasteReadout,
} from "./context-window-cache";

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

describe("cacheHitRates", () => {
  it("keeps last turn and session apart, at Pi's one decimal", () => {
    expect(
      cacheHitRates({ lastTurnCacheHitRatePct: 34.5234, sessionCacheHitRatePct: 71.25 }),
    ).toEqual({ lastTurn: "34.5", session: "71.3" });
  });

  it("reports whichever rate exists on its own", () => {
    expect(cacheHitRates({ lastTurnCacheHitRatePct: 12.04 })).toEqual({
      lastTurn: "12.0",
      session: null,
    });
    expect(cacheHitRates({ sessionCacheHitRatePct: 90 })).toEqual({
      lastTurn: null,
      session: "90.0",
    });
  });

  it("shows nothing when no rate was reported", () => {
    expect(cacheHitRates(undefined)).toBe(null);
    expect(cacheHitRates({})).toBe(null);
    expect(cacheHitRates({ lastTurnCacheHitRatePct: Number.NaN })).toBe(null);
    expect(cacheHitRates({ sessionCacheHitRatePct: -1 })).toBe(null);
  });
});

describe("cacheWasteReadout", () => {
  it("shows re-billed tokens and their cost", () => {
    expect(
      cacheWasteReadout({ cacheWaste: { tokens: 214_388, costUsd: 0.61, missCount: 2 } }, format),
    ).toEqual({
      tokens: "214k",
      cost: "$0.61",
      misses: 2,
    });
  });

  it("keeps a sub-cent cost visible in thousandths", () => {
    expect(
      cacheWasteReadout({ cacheWaste: { tokens: 40_000, costUsd: 0.0054, missCount: 1 } }, format),
    ).toEqual({
      tokens: "40k",
      cost: "$0.005",
      misses: 1,
    });
  });

  it("drops the cost when the provider priced nothing", () => {
    expect(cacheWasteReadout({ cacheWaste: { tokens: 40_000, costUsd: 0 } }, format)).toEqual({
      tokens: "40k",
      cost: null,
      misses: null,
    });
  });

  it("leaves the miss count out when it is not a whole number of misses", () => {
    expect(cacheWasteReadout({ cacheWaste: { tokens: 40_000, missCount: 0 } }, format)).toEqual({
      tokens: "40k",
      cost: null,
      misses: null,
    });
    expect(cacheWasteReadout({ cacheWaste: { tokens: 40_000, missCount: 1.5 } }, format)).toEqual({
      tokens: "40k",
      cost: null,
      misses: null,
    });
  });

  it("shows nothing without waste", () => {
    expect(cacheWasteReadout(undefined, format)).toBe(null);
    expect(cacheWasteReadout({ cacheWaste: { tokens: 0, costUsd: 0.2 } }, format)).toBe(null);
  });
});

describe("cacheModelCosts", () => {
  it("formats each model's cost and volume", () => {
    expect(
      cacheModelCosts(
        {
          costByModel: [
            { key: "openai/gpt-5", costUsd: 1.52, tokens: 612_000 },
            { key: "anthropic/claude", costUsd: 0.32, tokens: 94_000 },
          ],
        },
        format,
      ),
    ).toEqual([
      { key: "openai/gpt-5", cost: "$1.52", tokens: "612k" },
      { key: "anthropic/claude", cost: "$0.32", tokens: "94k" },
    ]);
  });

  it("shows nothing when no model was reported", () => {
    expect(cacheModelCosts(undefined, format)).toEqual([]);
    expect(cacheModelCosts({ costByModel: [{ key: "" }] }, format)).toEqual([]);
  });
});
