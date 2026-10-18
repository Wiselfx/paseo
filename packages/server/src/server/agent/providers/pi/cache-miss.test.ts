import { describe, expect, it } from "vitest";
import {
  CACHE_TTL_MS,
  detectCacheMiss,
  formatCacheMissNotice,
  formatTokens,
  nextRequest,
  type CacheRequest,
} from "./cache-miss.js";

const inputCostPerToken = 3 / 1_000_000;
const cacheReadCostPerToken = 0.3 / 1_000_000;

function priced(input: number, cacheRead: number, cacheWrite = 0, rates = 1) {
  const inputRate = inputCostPerToken * rates;
  const readRate = cacheReadCostPerToken * rates;
  return {
    input,
    cacheRead,
    cacheWrite,
    output: 100,
    cost: {
      input: input * inputRate,
      cacheRead: cacheRead * readRate,
      cacheWrite: cacheWrite * inputRate,
      output: 0,
      total: 0,
    },
  };
}

function previous(promptTokens: number, overrides: Partial<CacheRequest> = {}): CacheRequest {
  return {
    promptTokens,
    modelKey: "anthropic/claude",
    timestampMs: 0,
    reportedCache: true,
    ...overrides,
  };
}

const context = { modelKey: "anthropic/claude", timestampMs: 1_000 };

describe("Pi cache miss detection", () => {
  it("ignores the first request of a session", () => {
    expect(detectCacheMiss(undefined, priced(60_000, 0), context)).toBeUndefined();
  });

  it("ignores a provider that has never reported cache activity", () => {
    const miss = detectCacheMiss(
      previous(60_000, { reportedCache: false }),
      priced(60_000, 0),
      context,
    );
    expect(miss).toBeUndefined();
  });

  it("ignores misses at or below the breakpoint noise floor", () => {
    expect(detectCacheMiss(previous(60_000), priced(1_000, 5_000), context)).toBeUndefined();
  });

  it("counts the previous prompt tokens that were billed again", () => {
    const miss = detectCacheMiss(previous(200_000), priced(60_000, 5_000), context);
    expect(miss).toMatchObject({
      missedTokens: 60_000,
      idleMs: 1_000,
      modelChanged: false,
    });
    expect(miss?.missedCostUsd).toBeCloseTo(
      60_000 * (inputCostPerToken - cacheReadCostPerToken),
      6,
    );
  });

  it("prices a total miss from the model's cache-read rate", () => {
    const miss = detectCacheMiss(previous(30_000), priced(30_000, 0), {
      ...context,
      modelCacheReadPerToken: cacheReadCostPerToken,
    });
    expect(miss?.missedTokens).toBe(30_000);
    expect(miss?.missedCostUsd).toBeCloseTo(
      30_000 * (inputCostPerToken - cacheReadCostPerToken),
      6,
    );
  });

  it("flags a model switch and idle gaps past the cache lifetime", () => {
    expect(
      detectCacheMiss(previous(30_000), priced(30_000, 0), {
        modelKey: "openai/gpt",
        timestampMs: 1_000,
      })?.modelChanged,
    ).toBe(true);
    expect(
      detectCacheMiss(previous(30_000, { timestampMs: 0 }), priced(30_000, 0), {
        ...context,
        timestampMs: CACHE_TTL_MS + 60_000,
      })?.idleMs,
    ).toBe(CACHE_TTL_MS + 60_000);
  });
});

describe("Pi cache miss notice", () => {
  it("stays quiet below the display thresholds", () => {
    const miss = detectCacheMiss(previous(50_000), priced(2_000, 41_000), context);
    expect(miss).toBeDefined();
    expect(formatCacheMissNotice(miss!)).toBeUndefined();
  });

  it("reports re-billed tokens with their cost", () => {
    const miss = detectCacheMiss(previous(200_000), priced(60_000, 5_000), context);
    expect(formatCacheMissNotice(miss!)).toBe("Cache miss: 60K tokens re-billed (~$0.16)");
  });

  it("names a model switch and an idle gap as the cause", () => {
    const switched = detectCacheMiss(previous(200_000), priced(60_000, 5_000), {
      ...context,
      modelKey: "openai/gpt",
    });
    expect(formatCacheMissNotice(switched!)).toContain("after model switch");

    const idle = detectCacheMiss(previous(200_000, { timestampMs: 0 }), priced(60_000, 5_000), {
      ...context,
      timestampMs: CACHE_TTL_MS + 7 * 60_000,
    });
    expect(formatCacheMissNotice(idle!)).toContain("after 12m idle");
  });

  it("omits a cost too small to name", () => {
    const miss = detectCacheMiss(previous(30_000), priced(25_000, 1_000, 0, 0.1), context);
    expect(miss?.missedCostUsd).toBeLessThan(0.01);
    expect(formatCacheMissNotice(miss!)).toBe("Cache miss: 25K tokens re-billed");
  });
});

describe("Pi cache token formatting", () => {
  it.each([
    [999, "999"],
    [20_000, "20K"],
    [41_200, "41.2K"],
    [1_200_000, "1.2M"],
  ])("formats %i as %s", (value, expected) => {
    expect(formatTokens(value)).toBe(expected);
  });
});

describe("Pi cache request tracking", () => {
  it("reports cache activity seen at any point in the session", () => {
    expect(nextRequest(priced(10, 5_000), "anthropic/claude", 1_000, false)).toMatchObject({
      promptTokens: 5_010,
      reportedCache: true,
    });
    expect(nextRequest(priced(10, 0), "anthropic/claude", 1_000, true)).toMatchObject({
      promptTokens: 10,
      reportedCache: true,
    });
  });

  it("declines a request with nothing to compare", () => {
    expect(
      nextRequest({ input: 0, cacheRead: 0, cacheWrite: 0 }, "anthropic/claude", 1_000, true),
    ).toBeUndefined();
  });
});
