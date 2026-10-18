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
