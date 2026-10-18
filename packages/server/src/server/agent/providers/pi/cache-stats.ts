import {
  detectCacheMiss,
  formatCacheMissNotice,
  nextRequest,
  promptTokens,
  type CacheRequest,
} from "./cache-miss.js";
import type { PiAgentMessage, PiMessageUsage } from "./rpc-types.js";

/**
 * Session-wide prompt-cache figures, accumulated the same way Pi's TUI derives
 * them: walk the assistant messages in order, compare each request against the
 * one before it, and keep a running total of what was re-billed.
 *
 * Pi's own scan reads session entries, which see two things a message list
 * cannot: `cache_warm` requests (they become the baseline for the next turn) and
 * compaction resets. A resumed Pi session therefore may account slightly
 * differently than the live one. The messages are the transcript Paseo renders,
 * so notices here match the transcript exactly, and the totals match those
 * notices.
 */

export interface PiCacheWaste {
  tokens: number;
  costUsd: number;
  missCount: number;
}

export interface PiModelCost {
  key: string;
  costUsd: number;
  tokens: number;
}

export interface PiCacheStats {
  waste: PiCacheWaste;
  costByModel: PiModelCost[];
  lastTurnHitRatePct?: number;
}

export interface PiCacheScan extends PiCacheStats {
  /** Notice text per assistant message, keyed by the message object itself. */
  notices: Map<PiAgentMessage, string>;
}

type AssistantMessage = Extract<PiAgentMessage, { role: "assistant" }>;

export interface PiCacheAccumulatorOptions {
  /**
   * The model's cache-read price per token, used when a message reports no cache
   * reads at all — the total-miss case, where the message's own breakdown cannot
   * say what a cache read would have cost.
   */
  readRatePerToken?: () => number | undefined;
}

export class PiCacheAccumulator {
  private previous: CacheRequest | undefined;
  private readonly waste: PiCacheWaste = { tokens: 0, costUsd: 0, missCount: 0 };
  private readonly byModel = new Map<string, PiModelCost>();
  private lastTurnHitRatePct: number | undefined;

  constructor(private readonly options: PiCacheAccumulatorOptions = {}) {}

  /**
   * Folds one assistant message in. `timestampMs` is omitted when the message
   * comes from history, where no timing is known: a modern idle gap then cannot
   * be named as the cause, which is the honest answer.
   */
  observe(message: AssistantMessage, timestampMs?: number): string | undefined {
    const usage = message.usage;
    if (!usage) {
      return undefined;
    }
    const modelKey = `${message.provider ?? ""}/${message.model ?? ""}`;
    const miss = detectCacheMiss(this.previous, usage, {
      modelKey,
      timestampMs,
      modelCacheReadPerToken: this.options.readRatePerToken?.(),
    });
    this.previous =
      nextRequest(usage, modelKey, timestampMs, this.previous?.reportedCache ?? false) ??
      this.previous;
    this.recordUsage(modelKey, usage);
    this.recordHitRate(usage);
    if (!miss) {
      return undefined;
    }
    // Totals count every miss above the noise floor, as Pi's own session waste
    // does; the notice is the stricter display gate on top of that.
    this.waste.tokens += miss.missedTokens;
    this.waste.costUsd += miss.missedCostUsd;
    this.waste.missCount += 1;
    return formatCacheMissNotice(miss);
  }

  stats(): PiCacheStats {
    return {
      waste: { ...this.waste },
      costByModel: Array.from(this.byModel.values(), (entry) => ({
        key: entry.key,
        costUsd: entry.costUsd,
        tokens: entry.tokens,
      })),
      ...(this.lastTurnHitRatePct === undefined
        ? {}
        : { lastTurnHitRatePct: this.lastTurnHitRatePct }),
    };
  }

  /** Forgets everything, so a resumed transcript can seed the accumulator again. */
  reset(): void {
    this.previous = undefined;
    this.waste.tokens = 0;
    this.waste.costUsd = 0;
    this.waste.missCount = 0;
    this.byModel.clear();
    this.lastTurnHitRatePct = undefined;
  }

  /**
   * Drops the comparison baseline, keeping the totals: after a compaction the
   * next prompt is new content rather than re-billed content, which is what Pi's
   * own scan does when it meets a compaction entry.
   */
  forgetPrevious(): void {
    this.previous = undefined;
  }

  /** Folds a whole transcript in, returning the notice per message that deserves one. */
  observeAll(messages: readonly PiAgentMessage[]): Map<PiAgentMessage, string> {
    const notices = new Map<PiAgentMessage, string>();
    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }
      const notice = this.observe(message);
      if (notice) {
        notices.set(message, notice);
      }
    }
    return notices;
  }

  private recordUsage(modelKey: string, usage: PiMessageUsage): void {
    const entry = this.byModel.get(modelKey) ?? { key: modelKey, costUsd: 0, tokens: 0 };
    entry.costUsd += usage.cost?.total ?? 0;
    entry.tokens += usage.totalTokens ?? promptTokens(usage) + (usage.output ?? 0);
    this.byModel.set(modelKey, entry);
  }

  private recordHitRate(usage: PiMessageUsage): void {
    const prompt = promptTokens(usage);
    if (prompt > 0 && (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0) > 0) {
      this.lastTurnHitRatePct = ((usage.cacheRead ?? 0) / prompt) * 100;
    }
  }
}

/** One pass over a transcript, as history hydration or a test sees it. */
export function scanPiCache(
  messages: readonly PiAgentMessage[],
  options: PiCacheAccumulatorOptions = {},
): PiCacheScan {
  const accumulator = new PiCacheAccumulator(options);
  const notices = accumulator.observeAll(messages);
  return { ...accumulator.stats(), notices };
}
