/**
 * Reimplemented reasoning reveal, from `dsh-claude-style`.
 *
 * Source: `features/chat-fold/reasoning-stream.ts` and `tokens.json`
 * `--dsh-claude-duration-step` (500ms).
 *
 * The web skin plays the reasoning back like transitions.dev's "Reasoning
 * stream": text steps up two lines at a time on its own clock instead of
 * pushing the conversation down line by line, with a soft mask at each
 * edge once it can step. It reads as live text — no copy, no wrap — and
 * stops at the newest line so the reader never loses the end.
 *
 * The web version hangs the step on a CSS transition and clips the window
 * with a stylesheet. React Native has neither CSS transitions on arbitrary
 * layout nor a compositor-friendly text window, so this is reimplemented
 * as a JS-driven rise: the visible window height steps toward the text
 * height at `--dsh-claude-duration-step`, and the text translates inside
 * the window. The mask is the one deliberate omission — there is no
 * measurement behind it in the source and RN has no cheap equivalent.
 */

/**
 * The step the reasoning window rises by: two lines at a time, matching
 * `FALLBACKS.lines` in `reasoning-stream.ts`.
 */
export const REASON_STEP_LINES = 2;

/** The step's clock, from `--dsh-claude-duration-step`. */
export const REASON_STEP_MS = 500;

/**
 * How many lines the window has grown past the last step. A model can
 * write faster than two lines a step, so one rise covers as many two-line
 * steps as the text has added — the same rule `reasoning-stream.ts`
 * documents.
 */
export function reasoningStepLines(grownLines: number): number {
  if (grownLines <= 0) return 0;
  return Math.ceil(grownLines / REASON_STEP_LINES) * REASON_STEP_LINES;
}

/**
 * The window's height at one step: the text's own height, held under the
 * cap, rounded up to a whole step boundary so the text never steps mid-line.
 */
export function reasoningWindowHeight(
  textHeight: number,
  lineHeight: number,
  cap: number,
  steppedHeight: number,
): number {
  const target = Math.min(textHeight, cap);
  const step = Math.max(1, Math.round((lineHeight * REASON_STEP_LINES) || 1));
  const snapped = Math.ceil(target / step) * step;
  return Math.max(snapped, Math.min(steppedHeight, target));
}
