import { describe, expect, it } from "vitest";
import {
  detectCacheMiss,
  formatCacheMissNotice,
  formatTokens,
  nextRequest,
  type CacheMiss,
  type CacheRequest,
} from "./cache-miss.js";

const inputRate = 3 / 1_000_000;
const readRate = 0.3 / 1_000_000;

function priced(input: number, cacheRead: number, cacheWrite = 0, rates = 1) {
  const inputRateHere = inputRate * rates;
  const readRateHere = readRate * rates;
  const cost = {
    input: input * inputRateHere,
    cacheRead: cacheRead * readRateHere,
    cacheWrite: cacheWrite * inputRateHere,
    output: 0,
    total: 0,
  };
  return {
    input,
    cacheRead,
    cacheWrite,
    output: 100,
    totalTokens: input + cacheRead + cacheWrite + 100,
    cost,
  };
}

/** An unpriced message: the provider reported tokens but no cost buckets. */
function unpriced(input: number, cacheRead: number) {
  return { ...priced(input, cacheRead), cost: undefined };
}

function previous(promptTokens: number, overrides: Partial<CacheRequest> = {}): CacheRequest {
  return {
    promptTokens,
    modelKey: "anthropic/claude",
    timestampMs: 0,
    cachedAnything: true,
    cachedTokens: promptTokens,
    reportedCache: true,
    ...overrides,
  };
}

function missFor(
  previousRequest: CacheRequest | undefined,
  usage: ReturnType<typeof priced>,
  context: Partial<{ modelKey: string; timestampMs: number; modelCacheReadPerToken: number }> = {},
): CacheMiss | undefined {
  return detectCacheMiss(previousRequest, usage, {
    modelKey: "anthropic/claude",
    ...context,
  });
}

function notice(miss: CacheMiss | undefined): string | undefined {
  return miss ? formatCacheMissNotice(miss) : undefined;
}

describe("Pi cache miss detection", () => {
  it("ignores the first request of a session", () => {
    expect(missFor(undefined, priced(60_000, 0))).toBeUndefined();
  });

  it("ignores a provider that has never reported cache activity", () => {
    const neverCached = previous(60_000, {
      reportedCache: false,
      cachedAnything: false,
      cachedTokens: 0,
    });
    expect(missFor(neverCached, priced(60_000, 0))).toBeUndefined();
    // A stray cache read is not proof the earlier prompt was cached: nothing was
    // written, so there was no discount to lose, only a cold start.
    expect(missFor(neverCached, priced(16_724, 187))).toBeUndefined();
  });

  it("ignores a previous prompt the cache barely held", () => {
    // Some providers cache a few hundred tokens and bill the rest every turn.
    // That re-bills tokens, but nothing was ever discounted to lose.
    const barelyCached = previous(16_911, { cachedTokens: 187 });
    expect(missFor(barelyCached, priced(33_000, 186))).toBeUndefined();
  });

  it("ignores misses at or below the breakpoint noise floor", () => {
    expect(missFor(previous(60_000), priced(1_000, 5_000))).toBeUndefined();
  });

  it("counts the previous prompt tokens that were billed again", () => {
    const miss = missFor(previous(200_000), priced(60_000, 5_000));
    expect(miss).toMatchObject({
      missedTokens: 60_000,
      promptTokens: 65_000,
      previousPromptTokens: 200_000,
      cacheRead: 5_000,
      modelChanged: false,
      previousCachedAnything: true,
    });
    expect(miss?.missedCostUsd).toBeCloseTo(60_000 * (inputRate - readRate), 6);
  });

  it("prices a total miss from the model's cache-read rate", () => {
    const miss = missFor(previous(30_000), priced(30_000, 0), {
      modelCacheReadPerToken: readRate,
    });
    expect(miss?.missedTokens).toBe(30_000);
    expect(miss?.missedCostUsd).toBeCloseTo(30_000 * (inputRate - readRate), 6);
  });

  it("leaves a total miss unpriced when that model's rate is unknown", () => {
    expect(missFor(previous(30_000), priced(30_000, 0))?.missedCostUsd).toBeNull();
  });

  it("leaves a miss unpriced when the message prices nothing", () => {
    expect(missFor(previous(200_000), unpriced(60_000, 5_000))?.missedCostUsd).toBeNull();
  });

  it("reports a gap only when both requests were timed", () => {
    expect(missFor(previous(60_000), priced(60_000, 0), { timestampMs: 40_000 })?.gapMs).toBe(
      40_000,
    );
    expect(missFor(previous(60_000, { timestampMs: undefined }), priced(60_000, 0))?.gapMs).toBe(
      null,
    );
  });

  it("flags a model switch", () => {
    expect(missFor(previous(60_000), priced(60_000, 0), { modelKey: "openai/gpt" })).toMatchObject({
      modelChanged: true,
      previousModelKey: "anthropic/claude",
    });
  });
});

describe("Pi cache miss notice", () => {
  it("states the loss against the prompt it came from", () => {
    expect(notice(missFor(previous(65_000), priced(60_000, 5_000)))).toBe(
      "Cache miss · 60K of a 65K prompt re-billed (~$0.16)",
    );
  });

  it("stays quiet below the display thresholds", () => {
    expect(notice(missFor(previous(50_000), priced(2_000, 41_000)))).toBeUndefined();
  });

  it("omits a cost it cannot stand behind", () => {
    expect(notice(missFor(previous(65_000), unpriced(60_000, 5_000)))).toBe(
      "Cache miss · 60K of a 65K prompt re-billed",
    );
  });

  it("adds the gap as a measurement, not a cause", () => {
    expect(
      notice(missFor(previous(65_000), priced(60_000, 5_000), { timestampMs: 12 * 60_000 })),
    ).toBe("Cache miss · 60K of a 65K prompt re-billed (~$0.16) · 12m since the last turn");
  });

  it.each([
    [30_000, "30s"],
    [12 * 60_000, "12m"],
    [2 * 3_600_000, "2h"],
  ])("formats a %ims gap as %s", (gap, expected) => {
    expect(
      notice(missFor(previous(65_000), priced(60_000, 5_000), { timestampMs: gap })),
    ).toContain(`· ${expected} since the last turn`);
  });

  it("names the model switch, dropping a shared provider", () => {
    expect(
      notice(
        missFor(previous(65_000), priced(60_000, 5_000), {
          modelKey: "anthropic/claude-opus",
          timestampMs: 60_000,
        }),
      ),
    ).toBe(
      "Cache miss · 60K of a 65K prompt re-billed (~$0.16) · model claude → claude-opus · 60s since the last turn",
    );
  });

  it("keeps the provider when the switch crossed providers", () => {
    expect(
      notice(missFor(previous(65_000), priced(60_000, 5_000), { modelKey: "openai/gpt" })),
    ).toContain("· model anthropic/claude → openai/gpt");
  });

  it("names a prompt that lost content, and stays quiet about ordinary growth", () => {
    expect(notice(missFor(previous(70_000), priced(60_000, 5_000)))).toContain(
      "· prompt 70K → 65K",
    );
    expect(notice(missFor(previous(60_000), priced(60_000, 5_000)))).not.toContain("· prompt");
    expect(notice(missFor(previous(30_000), priced(60_000, 5_000)))).not.toContain("· prompt");
  });

  it("notes when nothing came from cache, and when nothing had been cached", () => {
    expect(notice(missFor(previous(60_000), priced(60_000, 0)))).toContain(
      "· nothing served from cache",
    );
    expect(
      notice(missFor(previous(60_000, { cachedAnything: false }), priced(60_000, 5_000))),
    ).toContain("· previous turn cached nothing");
  });

  it("stacks every fact it has, in a fixed order", () => {
    expect(
      notice(
        missFor(previous(70_000, { cachedAnything: false }), priced(65_000, 0), {
          modelKey: "openai/gpt",
          timestampMs: 9 * 60_000,
          modelCacheReadPerToken: readRate,
        }),
      ),
    ).toBe(
      "Cache miss · 65K of a 65K prompt re-billed (~$0.18) · model anthropic/claude → openai/gpt · prompt 70K → 65K · nothing served from cache · previous turn cached nothing · 9m since the last turn",
    );
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
      cachedAnything: true,
      reportedCache: true,
    });
    expect(nextRequest(priced(10, 0), "anthropic/claude", 1_000, true)).toMatchObject({
      promptTokens: 10,
      cachedAnything: false,
      reportedCache: true,
    });
  });

  it("declines a request with nothing to compare", () => {
    expect(
      nextRequest({ input: 0, cacheRead: 0, cacheWrite: 0 }, "anthropic/claude", 1_000, true),
    ).toBeUndefined();
  });
});
