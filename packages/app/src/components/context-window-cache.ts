/**
 * The prompt-cache counters a provider reported, formatted for display and
 * nothing more: no ratio, no second opinion. `cachedInputTokens` is what the
 * provider read from cache this session; `inputTokens` rides along as the
 * comparison the number is useless without. Providers that report no cache
 * reads show nothing.
 */
export interface CacheReadout {
  read: string;
  input: string | null;
}

export interface CacheUsageNumbers {
  cachedInputTokens?: number | null;
  inputTokens?: number | null;
  sessionCacheHitRatePct?: number | null;
  lastTurnCacheHitRatePct?: number | null;
  cacheWaste?: { tokens?: number | null; costUsd?: number | null } | null;
  costByModel?:
    | readonly { key?: string | null; costUsd?: number | null; tokens?: number | null }[]
    | null;
}

export function cacheReadout(
  usage: CacheUsageNumbers | null | undefined,
  format: (value: number) => string,
): CacheReadout | null {
  const cached = usage?.cachedInputTokens;
  if (!isPositiveNumber(cached)) {
    return null;
  }
  const input = usage?.inputTokens;
  return {
    read: format(cached),
    input: isPositiveNumber(input) ? format(input) : null,
  };
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * The hit rates Pi reports: the last turn's, and the session's. Both come from
 * the provider as percentages, so nothing here is recomputed — only rounded to
 * the one decimal Pi's own display uses.
 */
export interface CacheHitRates {
  lastTurn: string | null;
  session: string | null;
}

export function cacheHitRates(usage: CacheUsageNumbers | null | undefined): CacheHitRates | null {
  const lastTurn = percentage(usage?.lastTurnCacheHitRatePct);
  const session = percentage(usage?.sessionCacheHitRatePct);
  if (!lastTurn && !session) {
    return null;
  }
  return { lastTurn, session };
}

/** Prompt tokens this session paid for again, and what that cost where priced. */
export interface CacheWasteReadout {
  tokens: string;
  cost: string | null;
}

export function cacheWasteReadout(
  usage: CacheUsageNumbers | null | undefined,
  format: (value: number) => string,
): CacheWasteReadout | null {
  const waste = usage?.cacheWaste;
  if (!isPositiveNumber(waste?.tokens)) {
    return null;
  }
  return {
    tokens: format(waste.tokens),
    cost: isPositiveNumber(waste.costUsd) ? formatCost(waste.costUsd) : null,
  };
}

/** Cost and volume per model, when a session touched more than one. */
export interface CacheModelCost {
  key: string;
  cost: string;
  tokens: string;
}

export function cacheModelCosts(
  usage: CacheUsageNumbers | null | undefined,
  format: (value: number) => string,
): CacheModelCost[] {
  const reported = usage?.costByModel;
  if (!reported) {
    return [];
  }
  return reported
    .filter((entry) => typeof entry.key === "string" && entry.key !== "")
    .map((entry) => ({
      key: entry.key as string,
      cost: formatCost(isPositiveNumber(entry.costUsd) ? entry.costUsd : 0),
      tokens: format(isPositiveNumber(entry.tokens) ? entry.tokens : 0),
    }));
}

/** One decimal, as Pi prints its rates; a value it never reported stays absent. */
function percentage(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value.toFixed(1);
}

/** Cents below a cent, thousandths above it, so a small waste is not rounded away. */
function formatCost(value: number): string {
  return `$${value >= 0.01 ? value.toFixed(2) : value.toFixed(3)}`;
}
