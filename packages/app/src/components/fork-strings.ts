/**
 * Text this fork adds to the UI.
 *
 * The fork's own surfaces are English-only on purpose. Adding one string to the
 * app's translation resources obliges all nine supported locales to carry a
 * translation: `i18n/resources.test.ts` requires each locale's key set to equal
 * English's, and refuses strings identical to English. That is eight translations
 * per new string, written by whoever adds the string and reviewed by nobody.
 *
 * So: upstream text keeps using `t()` from the locale resources, and anything the
 * fork introduces lives here as a plain literal. If the fork ever needs to ship a
 * second language, this module is the whole surface to translate.
 */

export const forkText = {
  /** Prompt-cache figures in the context panel. */
  cacheRead: (read: string) => `Cache read ${read}`,
  cacheReadWithInput: (read: string, input: string) => `Cache read ${read} · input ${input}`,
  cacheHit: (lastTurn: string, session: string) =>
    `Cache hit ${lastTurn}% last turn · ${session}% session`,
  cacheHitLastTurn: (lastTurn: string) => `Cache hit ${lastTurn}% last turn`,
  cacheHitSession: (session: string) => `Cache hit ${session}% session`,
  cacheWaste: (tokens: string, cost: string, misses: string | null) =>
    `Cache re-billed ${tokens} tokens (${cost})${misses ? ` · ${misses} this session` : ""}`,
  cacheWasteNoCost: (tokens: string, misses: string | null) =>
    `Cache re-billed ${tokens} tokens${misses ? ` · ${misses} this session` : ""}`,
  cacheMisses: (count: number) => `${count} miss${count === 1 ? "" : "es"}`,
  cacheCostByModel: (parts: string) => `Cost by model: ${parts}`,
};
