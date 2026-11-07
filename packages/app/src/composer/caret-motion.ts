/**
 * Claude-style caret motion, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/caret/caret.ts`, `caret.css`,
 * `caret.manifest.ts`, plus `tokens.json` `--dsh-claude-duration-instant`
 * (80ms) and `--dsh-claude-period-blink` (1000ms).
 *
 * The browser's caret has no animatable property beyond its colour and its
 * blink, so a transition has only one road: make it transparent and draw
 * one. What the switch means:
 *
 * - `typing` (on): the caret is drawn and every move transitions;
 * - `off`: nothing is taken over at all — the browser's own caret throughout.
 *   That road is also the fallback, because the one way this effect really
 *   hurts a reader is a caret that cannot be seen.
 *
 * Two more rules, both measured in a real Chromium: the first frame the
 * drawn caret appears writes its place with no transition (otherwise it
 * slides in from wherever it last was), and a measurement that fails hands
 * the native caret back rather than leaving the surface with none.
 */

/** The drawn caret's width, from `caret.css` (`width: 2px`). */
export const CARET_WIDTH = 2;
/** The caret's blink period, from `--dsh-claude-period-blink`. */
export const CARET_BLINK_MS = 1000;
/** The move's duration, from `--dsh-claude-duration-instant`. */
export const CARET_GLIDE_MS = 80;
/** How long after a focus change to look again, from `caret.ts`. */
export const CARET_FOCUS_SETTLE_MS = 120;

/** Whether the drawn caret may take over the native one. */
export function caretMotionEnabled(motion: "typing" | "off"): boolean {
  return motion === "typing";
}

/**
 * The caret's own colour: the native caret's colour, read off the element
 * when taking over. Falls back to the action colour when the native caret
 * carries none.
 */
export function caretColour(native: string | null | undefined, fallback: string): string {
  return native != null && native.length > 0 ? native : fallback;
}

/**
 * The blink opacity at one moment: 1 for the first half of the period,
 * 0 for the second. Matches `@keyframes dsh-claude-caret-blink { 50% { opacity: 0 } }`.
 */
export function caretBlinkOpacity(elapsedMs: number, periodMs: number = CARET_BLINK_MS): number {
  const phase = elapsedMs % periodMs;
  return phase < periodMs / 2 ? 1 : 0;
}
