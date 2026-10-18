import { describe, expect, it } from "vitest";
import { PiCacheAccumulator, scanPiCache } from "./cache-stats.js";
import type { PiAgentMessage } from "./rpc-types.js";

const inputRate = 3 / 1_000_000;
const readRate = 0.3 / 1_000_000;

function assistant(input: {
  input: number;
  cacheRead: number;
  cacheWrite?: number;
  output?: number;
  provider?: string;
  model?: string;
}) {
  const cacheWrite = input.cacheWrite ?? 0;
  const output = input.output ?? 100;
  const cost = {
    input: input.input * inputRate,
    cacheRead: input.cacheRead * readRate,
    cacheWrite: cacheWrite * inputRate,
    output: 0,
    total: input.input * inputRate + input.cacheRead * readRate + cacheWrite * inputRate,
  };
  return {
    role: "assistant" as const,
    content: [],
    provider: input.provider ?? "anthropic",
    model: input.model ?? "claude",
    usage: {
      input: input.input,
      cacheRead: input.cacheRead,
      cacheWrite,
      output,
      totalTokens: input.input + input.cacheRead + cacheWrite + output,
      cost,
    },
  } satisfies Extract<PiAgentMessage, { role: "assistant" }>;
}

describe("Pi cache stats", () => {
  it("counts waste for misses below the notice threshold", () => {
    const scan = scanPiCache([
      assistant({ input: 5_000, cacheRead: 40_000 }),
      assistant({ input: 2_000, cacheRead: 41_000 }),
    ]);
    // 2 000 missed tokens: too small to warn about, but still waste.
    expect(scan.waste.missCount).toBe(1);
    expect(scan.waste.tokens).toBe(2_000);
    expect([...scan.notices.values()]).toEqual([]);
  });

  it("names the notice for a miss worth warning about", () => {
    const messages = [
      assistant({ input: 5_000, cacheRead: 40_000 }),
      assistant({ input: 60_000, cacheRead: 5_000 }),
    ];
    const scan = scanPiCache(messages);
    expect(scan.waste).toMatchObject({ missCount: 1, tokens: 40_000 });
    expect(scan.notices.get(messages[1]!)).toBe(
      "Cache miss · 40K of a 65K prompt re-billed (~$0.11)",
    );
  });

  it("reports the last turn's hit rate, not the session's", () => {
    const scan = scanPiCache([
      assistant({ input: 5_000, cacheRead: 5_000 }),
      assistant({ input: 1_000, cacheRead: 44_000 }),
    ]);
    expect(scan.lastTurnHitRatePct).toBeCloseTo((44_000 / 45_000) * 100, 6);
  });

  it("leaves the hit rate undefined when nothing was cached", () => {
    const scan = scanPiCache([assistant({ input: 10_000, cacheRead: 0 })]);
    expect(scan.lastTurnHitRatePct).toBeUndefined();
    expect(scan.waste.missCount).toBe(0);
  });

  it("accumulates cost and tokens per model", () => {
    const scan = scanPiCache([
      assistant({ input: 1_000, cacheRead: 0, provider: "anthropic", model: "claude" }),
      assistant({ input: 1_000, cacheRead: 0, provider: "openai", model: "gpt" }),
      assistant({ input: 1_000, cacheRead: 0, provider: "anthropic", model: "claude" }),
    ]);
    expect(scan.costByModel).toEqual([
      expect.objectContaining({ key: "anthropic/claude", tokens: 2_200 }),
      expect.objectContaining({ key: "openai/gpt", tokens: 1_100 }),
    ]);
  });

  it("cannot report a gap from history", () => {
    const messages = [
      assistant({ input: 5_000, cacheRead: 40_000 }),
      assistant({ input: 60_000, cacheRead: 5_000 }),
    ];
    const scan = scanPiCache(messages);
    expect(scan.notices.get(messages[1]!)).not.toContain("since the last turn");
  });

  it("names a model switch without timestamps", () => {
    const messages = [
      assistant({ input: 5_000, cacheRead: 40_000 }),
      assistant({ input: 60_000, cacheRead: 5_000, provider: "openai", model: "gpt" }),
    ];
    expect(scanPiCache(messages).notices.get(messages[1]!)).toContain(
      "model anthropic/claude → openai/gpt",
    );
  });

  it("keeps accumulating across live turns with their own timing", () => {
    const accumulator = new PiCacheAccumulator({ readRatePerToken: () => readRate });
    accumulator.observe(assistant({ input: 5_000, cacheRead: 40_000 }), 1_000);
    expect(accumulator.observe(assistant({ input: 60_000, cacheRead: 5_000 }), 7 * 60_000)).toBe(
      "Cache miss · 40K of a 65K prompt re-billed (~$0.11) · 7m since the last turn",
    );
    expect(accumulator.stats().waste).toMatchObject({ missCount: 1, tokens: 40_000 });
  });
});
