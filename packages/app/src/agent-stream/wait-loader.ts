/**
 * Claude-style wait loader, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/chat-wait/wait-loader.ts` and
 * `chat-wait.css`, plus `tokens.json` `--dsh-claude-period-dot-orbit`
 * (2400ms), `--dsh-claude-period-dot-rotate` (10s),
 * `--dsh-claude-duration-dot-morph` (480ms), `--dsh-claude-period-dot-bounce`
 * (500ms) and `--dsh-claude-period-dot-line` (1250ms).
 *
 * The waiting line's loader carries three motions at once, one lane each:
 * the hopping dots (`bounce`, 3 dots), the dots walking three lines through
 * one point (`line`, 3 dots), and the four dots swapping the corners of a
 * 45:55 rectangle (`orbit`, 4 dots). It opens on one of the three at random,
 * then every 10s hands the row over to another — a motion never follows
 * itself, so the turn is always a visible change.
 *
 * A change is a morph: the dots travel from one motion into the next and the
 * box never empties. Each dot of the motion leaving waits for its own still
 * moment and at that frame the dot it is paired with in the motion arriving
 * takes its place, then carried into its own path over 480ms. Going from
 * three dots to four one splits in two; going from four to three the spare
 * one glides onto its partner and is gone where the two meet.
 *
 * This module is the state machine only. The web skin also pairs dots across
 * the lanes and interpolates positions between paths; RN keeps the same
 * lane order, period, and hand-over so the *visual* cadence matches.
 */

export type WaitLoaderMotion = "bounce" | "line" | "orbit";

export interface WaitLane {
  motion: WaitLoaderMotion;
  dots: number;
  /** One turn of the motion, in ms. */
  periodMs: number;
}

/** The three lanes, from `LANES` in `wait-loader.ts`. */
export const WAIT_LANES: readonly WaitLane[] = [
  { motion: "bounce", dots: 3, periodMs: 500 },
  { motion: "line", dots: 3, periodMs: 1250 },
  { motion: "orbit", dots: 4, periodMs: 2400 },
] as const;

/** How long one motion stands before another takes its place. */
export const WAIT_ROTATE_MS = 10000;
/** How long a dot takes to travel into the motion taking over. */
export const WAIT_MORPH_MS = 480;

const MOTIONS: readonly WaitLoaderMotion[] = ["bounce", "line", "orbit"] as const;

/** The next motion in the rotation: never the same as the one leaving. */
export function nextWaitMotion(current: WaitLoaderMotion, random: () => number = Math.random): WaitLoaderMotion {
  const others = MOTIONS.filter((motion) => motion !== current);
  const index = Math.floor(random() * others.length);
  return others[Math.min(index, others.length - 1)] ?? others[0] ?? "line";
}

/** The opening motion, chosen at random. */
export function firstWaitMotion(random: () => number = Math.random): WaitLoaderMotion {
  const index = Math.floor(random() * MOTIONS.length);
  return MOTIONS[Math.min(index, MOTIONS.length - 1)] ?? "line";
}

/** The hand-over cadence: a fresh timer each rotation. */
export function waitRotationPeriodMs(): number {
  return WAIT_ROTATE_MS;
}
