import type { PiMessageUsage } from "./rpc-types.js";

/**
 * Prompt-cache waste accounting for Pi sessions.
 *
 * Pi's TUI says "Cache miss", and names a reason only when it can — a model
 * switch or an idle gap past the cache lifetime. Everything else arrives with no
 * explanation, which reads as noise: you cannot act on "a cache miss" without
 * knowing what it looked like.
 *
 * So this module states measurements instead. The lead is always `Cache miss`;
 * after it come only the facts the provider's own numbers support — how much was
 * billed again, whether the model changed, whether the prompt changed shape,
 * whether anything came from cache, and how long the gap was. No clause claims a
 * cause, because none of them is a proof of one.
 *
 * The rules Pi applies are otherwise kept: the same noise floor, the same
 * display thresholds, and the same cost derivation from the message's own
 * breakdown. Pi scans session entries; the live path here compares a completed
 * assistant message against the request before it.
 */

/** Misses at or below this are prompt-cache breakpoint granularity, not waste. */
const NOISE_FLOOR_TOKENS = 1024;
/** Pi shows a notice only when the miss is this large or this expensive. */
export const NOTICE_MIN_TOKENS = 20_000;
export const NOTICE_MIN_COST_USD = 0.1;

/** Everything the model had to read for one request, cached or not. */
export function promptTokens(usage: PiMessageUsage): number {
  return (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
}

export interface CacheRequest {
  promptTokens: number;
  modelKey: string;
  /** Absent for requests recovered from history, where timing is unknown. */
  timestampMs?: number;
  /** Whether this request read from or wrote to the cache at all. */
  cachedAnything: boolean;
  /** Whether any request in this session has reported cache activity yet. */
  reportedCache: boolean;
}

export interface CacheMiss {
  /** Prompt tokens this request paid for again. */
  missedTokens: number;
  /** What they cost, or null when this message cannot price them. */
  missedCostUsd: number | null;
  /** Milliseconds since the previous request, or null when timing is unknown. */
  gapMs: number | null;
  modelKey: string;
  previousModelKey: string;
  modelChanged: boolean;
  promptTokens: number;
  previousPromptTokens: number;
  cacheRead: number;
  previousCachedAnything: boolean;
}

export function nextRequest(
  usage: PiMessageUsage,
  modelKey: string,
  timestampMs: number | undefined,
  reportedCache: boolean,
): CacheRequest | undefined {
  const tokens = promptTokens(usage);
  if (tokens <= 0) {
    return undefined;
  }
  const cachedAnything = (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0) > 0;
  return {
    promptTokens: tokens,
    modelKey,
    ...(timestampMs === undefined ? {} : { timestampMs }),
    cachedAnything,
    reportedCache: reportedCache || cachedAnything,
  };
}

export interface CacheMissContext {
  modelKey: string;
  /** Absent for a message recovered from history, where timing is unknown. */
  timestampMs?: number;
  /**
   * The cache-read price per token for *this* message's model, used when the
   * message reports no cache reads at all — the total-miss case, where its own
   * breakdown cannot say what a cache read would have cost. Undefined when no
   * matching price is known, which leaves the loss unpriced rather than mispriced.
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
  return {
    missedTokens,
    missedCostUsd: missedCostUsd(usage, missedTokens, context.modelCacheReadPerToken),
    gapMs: gapMs(previous, context.timestampMs),
    modelKey: context.modelKey,
    previousModelKey: previous.modelKey,
    modelChanged: context.modelKey !== previous.modelKey,
    promptTokens: tokens,
    previousPromptTokens: previous.promptTokens,
    cacheRead,
    previousCachedAnything: previous.cachedAnything,
  };
}

/**
 * Extra cost = missed tokens billed at the actual paid rate (input and cache
 * writes, including the write premium) instead of the cache-read rate. Missed
 * tokens can only land in those two buckets, so the paid rate comes straight
 * from this message's own breakdown. Null when the message prices nothing, or
 * when a cache read's own rate is unknown — a guess is worse than a blank.
 */
function missedCostUsd(
  usage: PiMessageUsage,
  missedTokens: number,
  fallbackReadRatePerToken: number | undefined,
): number | null {
  const paidTokens = (usage.input ?? 0) + (usage.cacheWrite ?? 0);
  const paidCost = (usage.cost?.input ?? 0) + (usage.cost?.cacheWrite ?? 0);
  if (paidTokens <= 0 || paidCost <= 0) {
    return null;
  }
  const paidPerToken = paidCost / paidTokens;
  const cacheRead = usage.cacheRead ?? 0;
  const readPerToken =
    cacheRead > 0 ? (usage.cost?.cacheRead ?? 0) / cacheRead : fallbackReadRatePerToken;
  if (readPerToken === undefined) {
    return null;
  }
  return missedTokens * Math.max(0, paidPerToken - readPerToken);
}

/** Without both timestamps there is no gap to report, and history carries no timing. */
function gapMs(previous: CacheRequest, timestampMs: number | undefined): number | null {
  if (timestampMs === undefined || previous.timestampMs === undefined) {
    return null;
  }
  return Math.max(0, timestampMs - previous.timestampMs);
}

/**
 * `Cache miss` plus every fact the numbers support, and nothing else. Undefined
 * when the miss is below Pi's display thresholds.
 */
export function formatCacheMissNotice(miss: CacheMiss): string | undefined {
  if (miss.missedTokens < NOTICE_MIN_TOKENS && (miss.missedCostUsd ?? 0) < NOTICE_MIN_COST_USD) {
    return undefined;
  }
  const clauses = [billedClause(miss)];
  if (miss.modelChanged) {
    clauses.push(modelClause(miss.previousModelKey, miss.modelKey));
  }
  // Only a prompt that lost content is worth naming: prompts grow every ordinary
  // turn, so reporting growth would put a clause on every notice.
  if (miss.promptTokens < miss.previousPromptTokens) {
    clauses.push(
      `prompt ${formatTokens(miss.previousPromptTokens)} → ${formatTokens(miss.promptTokens)}`,
    );
  }
  if (miss.cacheRead === 0) {
    clauses.push("nothing served from cache");
  }
  if (!miss.previousCachedAnything) {
    clauses.push("previous turn cached nothing");
  }
  if (miss.gapMs !== null) {
    clauses.push(`${formatGap(miss.gapMs)} since the last turn`);
  }
  return `Cache miss · ${clauses.join(" · ")}`;
}

function billedClause(miss: CacheMiss): string {
  const cost =
    miss.missedCostUsd !== null && miss.missedCostUsd >= 0.01
      ? ` (~$${miss.missedCostUsd.toFixed(2)})`
      : "";
  return `${formatTokens(miss.missedTokens)} of a ${formatTokens(miss.promptTokens)} prompt re-billed${cost}`;
}

/** `provider/model` collapses to the model alone when both keys share a provider. */
function modelClause(previousKey: string, key: string): string {
  const [previousProvider, ...previousRest] = previousKey.split("/");
  const [provider, ...rest] = key.split("/");
  const shared = previousProvider === provider && previousRest.length > 0 && rest.length > 0;
  return `model ${shared ? previousRest.join("/") : previousKey} → ${
    shared ? rest.join("/") : key
  }`;
}

function formatGap(ms: number): string {
  if (ms < 90_000) {
    return `${Math.max(0, Math.round(ms / 1000))}s`;
  }
  if (ms < 90 * 60_000) {
    return `${Math.round(ms / 60_000)}m`;
  }
  return `${trimZero(ms / 3_600_000)}h`;
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
