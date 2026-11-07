/**
 * Claude-style motion tokens, lifted from `Nwflower/dsh-claude-style`.
 *
 * Source: `/tmp/dsh/packages/client/src/theme/tokens.json`
 * - durations `--dsh-claude-duration-*` (lines 998-1160)
 * - easings `--dsh-claude-ease-*` (lines 1268-1342)
 *
 * The web skin expresses these as CSS custom properties and `cubic-bezier()`
 * curves. Reanimated worklets accept the same numerics, so the values port
 * as-is. Two tokens are web-only in the source and are reimplemented below:
 *
 * - `--dsh-claude-duration-step` (500ms reasoning-window step) — the web skin
 *   uses `transitions.dev`'s "Reasoning stream" via CSS. Reimplemented as a
 *   JS-driven rise in `features/chat-reveal` (see `reasoningStep`).
 * - `--dsh-claude-duration-flight` (400ms send flight) — the web skin uses a
 *   DOM morph (`send-morph.ts`/`send-flight.css`). Reimplemented as a
 *   transform-only scale flight in `features/chat-send` (see `sendFlight`).
 *
 * Everything else is a direct numeric lift.
 */

/** Durations in milliseconds, keyed by the dsh token name without the prefix. */
export const DSH_DURATION = {
  instant: 80,
  feedback: 120,
  reveal: 120,
  enter: 320,
  surface: 150,
  exit: 120,
  hintExit: 50,
  hintDelay: 80,
  open: 250,
  swap: 150,
  swapGap: 50,
  clearDelay: 200,
  clearText: 150,
  clear: 300,
  roll: 300,
  move: 200,
  count: 300,
  slide: 200,
  fade: 200,
  bounce: 350,
  flight: 400,
  step: 500,
  pop: 500,
  rise: 500,
  stagger: 70,
  reduced: 0.01,
} as const;

/**
 * Bézier curves from `--dsh-claude-ease-*`. Reanimated 4 evaluates these
 * with `Easing.bezier`, which is the same solver the browser uses.
 */
export const DSH_EASE = {
  standard: [0.4, 0, 0.2, 1] as const,
  out: [0, 0, 0.58, 1] as const,
  enter: [0.34, 1.3, 0.64, 1] as const,
  statusTitle: [0.45, 0, 0.55, 1] as const,
  inOut: [0.42, 0, 0.58, 1] as const,
  glide: [0.22, 0.61, 0.36, 1] as const,
  roll: [0.4, 0, 0.2, 1] as const,
  spring: [0.34, 1.45, 0.64, 1] as const,
  recoil: [0.34, 3.85, 0.64, 1] as const,
  settle: [0.22, 1, 0.36, 1] as const,
  harmonic: [0.37, 0, 0.63, 1] as const,
  dampedOut: [0.33, 1, 0.68, 1] as const,
  dampedIn: [0.32, 0, 0.67, 0] as const,
} as const;

export type DshDuration = keyof typeof DSH_DURATION;
export type DshEase = keyof typeof DSH_EASE;
