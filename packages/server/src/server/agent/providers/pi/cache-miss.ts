import type { PiMessageUsage } from "./rpc-types.js";

/**
 * Prompt-cache waste accounting for Pi sessions.
 *
 * Ported from Pi's own `cache-stats` module so a notice reads the same in Paseo
 * as it does in Pi's TUI: the same noise floor, the same cost derivation from
 * the message's own breakdown, and the same idle/model-change labels. Pi scans
 * session entries; the live path here compares a completed assistant message
 * against the request before it.
 */

/** Misses at or below this are prompt-cache breakpoint granularity, not waste. */
const NOISE_FLOOR_TOKENS = 1024;
/** Pi shows a notice only when the miss is this large or this expensive. */
export const NOTICE_MIN_TOKENS = 20_000;
export const NOTICE_MIN_COST_USD = 0.1;
/** Anthropic's default prompt-cache lifetime; longer idle gaps are named as the likely cause. */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Everything the model had to read for one request, cached or not. */
export function promptTokens(usage: PiMessageUsage): number {
  return (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
}

export interface CacheRequest {
  promptTokens: number;
  modelKey: string;
  timestampMs: number;
  /** Whether any request in this session has reported cache activity yet. */
  reportedCache: boolean;
}

export interface CacheMiss {
  missedTokens: number;
  missedCostUsd: number;
  idleMs: number;
  modelChanged: boolean;
}

export function nextRequest(
  usage: PiMessageUsage,
  modelKey: string,
  timestampMs: number,
  reportedCache: boolean,
): CacheRequest | undefined {
  const tokens = promptTokens(usage);
  if (tokens <= 0) {
    return undefined;
  }
  return {
    promptTokens: tokens,
    modelKey,
    timestampMs,
    reportedCache: reportedCache || (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0) > 0,
  };
}

export interface CacheMissContext {
  modelKey: string;
  timestampMs: number;
  /**
   * The model's cache-read price per token, used when the message reports no
   * cache reads at all — the total-miss case, where the message's own breakdown
   * cannot tell us what a cache read would have cost.
   */
  modelCacheReadPerToken?: number | undefined;
}

/**
 * Mirrors Pi's `detectMiss`: the previous request's prompt tokens that this
 * request paid for again. Returns undefined for the first request, for a
 * provider that has never reported cache activity, and for a miss small enough
 * to be breakpoint noise.
 */
export function detectCacheMiss(
  previous: CacheRequest | undefined,
  usage: PiMessageUsage,
  context: CacheMissContext,
): CacheMiss | undefined {
  const tokens = promptTokens(usage);
  const cacheRead = usage.cacheRead ?? 0;
  const cacheActivity = cacheRead + (usage.cacheWrite ?? 0);
  if (!previous || tokens <= 0 || (cacheActivity === 0 && !previous.reportedCache)) {
    return undefined;
  }
  const missedTokens = Math.min(previous.promptTokens, tokens) - cacheRead;
  if (missedTokens <= NOISE_FLOOR_TOKENS) {
    return undefined;
  }
  // Missed tokens can only land in the input or cacheWrite buckets, so the paid
  // rate comes straight from this message's own breakdown.
  const paidTokens = (usage.input ?? 0) + (usage.cacheWrite ?? 0);
  const paidCost = (usage.cost?.input ?? 0) + (usage.cost?.cacheWrite ?? 0);
  const paidPerToken = paidTokens > 0 ? paidCost / paidTokens : 0;
  const readPerToken =
    cacheRead > 0
      ? (usage.cost?.cacheRead ?? 0) / cacheRead
      : (context.modelCacheReadPerToken ?? 0);
  return {
    missedTokens,
    missedCostUsd: missedTokens * Math.max(0, paidPerToken - readPerToken),
    idleMs: Math.max(0, context.timestampMs - previous.timestampMs),
    modelChanged: `${context.modelKey}` !== previous.modelKey,
  };
}

/** The notice Pi's TUI would show, or undefined when the miss is not worth one. */
export function formatCacheMissNotice(miss: CacheMiss): string | undefined {
  if (miss.missedTokens < NOTICE_MIN_TOKENS && miss.missedCostUsd < NOTICE_MIN_COST_USD) {
    return undefined;
  }
  const cost = miss.missedCostUsd >= 0.01 ? ` (~$${miss.missedCostUsd.toFixed(2)})` : "";
  const billed = `${formatTokens(miss.missedTokens)} tokens re-billed${cost}`;
  if (miss.modelChanged) {
    return `Cache miss after model switch: ${billed}`;
  }
  if (miss.idleMs >= CACHE_TTL_MS) {
    return `Cache miss after ${Math.round(miss.idleMs / 60_000)}m idle: ${billed}`;
  }
  return `Cache miss: ${billed}`;
}

export function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${trimZero(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `${trimZero(value / 1_000)}K`;
  }
  return String(value);
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
