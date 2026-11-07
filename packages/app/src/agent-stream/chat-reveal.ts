/**
 * Claude-style per-character streaming reveal, reimplemented from
 * `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/chat-reveal/` — `reveal-engine.ts`
 * (240 lines), `reveal-diff.ts` (392), `reveal-paint.ts` (202),
 * `reveal-params.ts` (110) — plus `constants.ts` (`CHAT_REVEAL_STEPS = 24`,
 * `CHAT_REVEAL_MIN_OPACITY = 0.2`) and `scripts/feature-sheets.mjs`
 * (`revealSteps`).
 *
 * The web engine fades characters in as they arrive: each new character is
 * painted the moment it arrives at the faintest step (a scheduled frame
 * would leave one frame of full-strength text the eye reads as a flash),
 * then its alpha walks from 0.2 to fully opaque over 120ms across 24 steps
 * as a `color-mix` of the element's own colour. `::highlight()` accepts no
 * `opacity`, so the alpha rides on `color` — one rule per step, written by
 * the build from the same four values.
 *
 * React Native has no `::highlight()` and no CSS Custom Highlight API, so
 * this is the transform/opacity reimplementation, keeping every number and
 * every guard:
 *
 * - 24 steps, floor 0.2, one step per `CHAT_REVEAL_MS / 24`;
 * - stagger `CHAT_REVEAL_MS / 50` (2.4ms at the shipped 120ms), clamped to
 *   1–8ms, handed out by the character's order in the batch;
 * - frame-gap compensation (a slow frame subtracts the undrawn stretch so
 *   segments do not expire in one frame), guards yielding the fade when
 *   the main thread is busy (3000ms at full strength after 4 slow frames);
 * - burst limit 10000, first-sight limit 200, rewrite-diff budget 4096,
 *   local-rewrite limit 64, fold quiet 400ms.
 */

/** How many alpha steps a character walks through. `CHAT_REVEAL_STEPS`. */
export const REVEAL_STEPS = 24;
/** The faintest step: a fifth faint. `CHAT_REVEAL_MIN_OPACITY`. */
export const REVEAL_MIN_OPACITY = 0.2;
/** How long a character takes to become fully opaque. `--dsh-claude-duration-reveal`. */
export const REVEAL_MS = 120;
/** The stagger divisor: one fade's share of the stagger, proportional to the fade. */
export const REVEAL_STAGGER_DIVISOR = 50;
/** The stagger step's bounds. */
export const REVEAL_MIN_STAGGER_MS = 1;
export const REVEAL_MAX_STAGGER_MS = 8;
/** How long a container is left out after a fold. */
export const REVEAL_FOLD_QUIET_MS = 400;
/** The most characters one batch may hold. */
export const REVEAL_BURST_LIMIT = 10000;
/** The most characters a just-appeared container may hold and still count as new. */
export const REVEAL_FIRST_SIGHT_LIMIT = 200;
/** A gap longer than this means no frame was drawn in between. */
export const REVEAL_FRAME_GAP_MS = 40;
/** A normal frame at 60 Hz. */
export const REVEAL_NOMINAL_FRAME_MS = 16.7;
/** A frame gap longer than this counts as slow. */
export const REVEAL_SLOW_FRAME_MS = 50;
/** Slow frames in a row before the engine gives way. */
export const REVEAL_SLOW_FRAME_RUN = 4;
/** A gap this long is a hidden page, not a busy main thread. */
export const REVEAL_HIDDEN_GAP_MS = 1000;
/** How long after giving way new characters arrive at full strength. */
export const REVEAL_YIELD_MS = 3000;
/** The most characters the rewritten middle may hold and still be diffed. */
export const REWRITE_DIFF_BUDGET = 4096;
/** The most characters a diffed rewrite may add and still animate. */
export const LOCAL_REWRITE_LIMIT = 64;

/** One fading stretch of characters. */
export interface RevealSegment {
  /** Offset into the text, in UTF-16 units. */
  start: number;
  length: number;
  bornAt: number;
  delay: number;
}

/**
 * One Bidi/element's own colour, published by the scan so the fade paints
 * the character in the colour it will come to rest in — never a swap.
 */
export function revealColourAt(step: number, base: string): string {
  const clamped = Math.min(REVEAL_STEPS - 1, Math.max(0, step));
  const alpha = REVEAL_MIN_OPACITY + ((1 - REVEAL_MIN_OPACITY) * clamped) / (REVEAL_STEPS - 1);
  return alpha >= 1 ? base : `color-mix(in srgb, ${base} ${(alpha * 100).toFixed(2)}%, transparent)`;
}

/** The step an age maps to: 0 is faintest, the last is the element's own colour. */
export function revealStepForAge(ageMs: number): number {
  if (ageMs <= 0) return 0;
  return Math.min(REVEAL_STEPS - 1, Math.floor((ageMs / REVEAL_MS) * REVEAL_STEPS));
}

/** One stagger step for the batch, bounded by the engine's clamp. */
export function revealStaggerForBatch(count: number): number {
  if (count <= 1) return 0;
  const limit = Math.min(
    REVEAL_MAX_STAGGER_MS,
    Math.max(REVEAL_MIN_STAGGER_MS, REVEAL_MS / REVEAL_STAGGER_DIVISOR),
  );
  return Math.min(limit, REVEAL_MS / (count - 1));
}

/** The characters two strings share at their front; a streamed append is the native test. */
export function commonHead(left: string, right: string): number {
  if (left.length <= right.length && right.startsWith(left)) return left.length;
  if (right.length <= left.length && left.startsWith(right)) return right.length;
  const limit = Math.min(left.length, right.length);
  let shared = 0;
  while (shared < limit && left.charCodeAt(shared) === right.charCodeAt(shared)) shared += 1;
  return shared;
}

/** The characters two strings share at their end. */
export function commonTail(left: string, right: string): number {
  if (left.length <= right.length && right.endsWith(left)) return left.length;
  if (right.length <= left.length && left.endsWith(right)) return right.length;
  const limit = Math.min(left.length, right.length);
  let shared = 0;
  while (shared < limit && left.charCodeAt(left.length - 1 - shared) === right.charCodeAt(right.length - 1 - shared)) shared += 1;
  return shared;
}

/**
 * Which new characters in `newMiddle` match the old text, via a
 * character-level longest-common-subsequence pass over the middle.
 */
export function matchedByDiff(oldMiddle: string, newMiddle: string): Uint8Array {
  const matched = new Uint8Array(newMiddle.length);
  if (oldMiddle.length === 0) return matched;
  const columns = newMiddle.length + 1;
  const lengths = new Uint16Array((oldMiddle.length + 1) * columns);
  for (let row = oldMiddle.length - 1; row >= 0; row -= 1) {
    for (let column = newMiddle.length - 1; column >= 0; column -= 1) {
      const same = oldMiddle.charCodeAt(row) === newMiddle.charCodeAt(column);
      lengths[row * columns + column] = same
        ? (lengths[(row + 1) * columns + column + 1] ?? 0) + 1
        : Math.max(lengths[(row + 1) * columns + column] ?? 0, lengths[row * columns + column + 1] ?? 0);
    }
  }
  let row = 0;
  let column = 0;
  let matchedCount = 0;
  while (row < oldMiddle.length && column < newMiddle.length) {
    if (oldMiddle.charCodeAt(row) === newMiddle.charCodeAt(column)) {
      matched[column] = 1;
      matchedCount += 1;
      row += 1;
      column += 1;
      continue;
    }
    const skipOldRow = lengths[(row + 1) * columns + column] ?? 0;
    const skipNewColumn = lengths[row * columns + column + 1] ?? 0;
    const advanceOldRow = skipOldRow >= skipNewColumn;
    if (advanceOldRow) row += 1;
    if (!advanceOldRow) column += 1;
  }
  if (matchedCount === 0 || newMiddle.length - matchedCount > LOCAL_REWRITE_LIMIT) return matched;
  return matched;
}

/** One scan's queue: the segments for the characters that just appeared. */
export function scanRevealBatch(previous: string, next: string, now: number): RevealSegment[] {
  if (previous.length > 0 && next.length === 0) return [];
  const prefix = commonHead(previous, next);
  const suffix = commonTail(previous.slice(prefix), next.slice(prefix));
  const stableFrom = previous.length - suffix;
  const shift = next.length - previous.length;
  const oldMiddleLength = previous.length - prefix - suffix;
  const newMiddleLength = next.length - prefix - suffix;
  if (newMiddleLength === 0) return [];
  if (oldMiddleLength > 0 && oldMiddleLength * newMiddleLength > REWRITE_DIFF_BUDGET) return [];
  const oldMiddle = oldMiddleLength === 0 ? "" : previous.slice(prefix, stableFrom);
  const newMiddle = next.slice(prefix, next.length - suffix);
  const matched = matchedByDiff(oldMiddle, newMiddle);
  if (oldMiddle.length > 0 && matched.some((value) => value === 0) === false) return [];
  // Unmatched new characters are the batch; consecutive ones merge.
  const segments: RevealSegment[] = [];
  let rangeStart = -1;
  const flush = (end: number) => {
    if (rangeStart < 0) return;
    segments.push({ start: rangeStart + prefix, length: end - rangeStart, bornAt: now, delay: 0 });
    rangeStart = -1;
  };
  for (let index = 0; index < newMiddle.length; index += 1) {
    if (matched[index] === 1) {
      flush(index + prefix);
      continue;
    }
    if (rangeStart < 0) rangeStart = index;
  }
  flush(newMiddle.length + prefix);
  let addedLength = 0;
  for (const segment of segments) addedLength += segment.length;
  if (addedLength > REVEAL_BURST_LIMIT) return [];
  if (segments.length === 0) return [];
  const stagger = revealStaggerForBatch(segments.length);
  if (stagger !== 0) {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) continue;
      segment.delay = index * stagger;
    }
  }
  void shift;
  void stableFrom;
  return segments;
}
