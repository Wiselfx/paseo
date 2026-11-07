/**
 * Reimplemented send flight, from `dsh-claude-style`.
 *
 * Source: `features/chat-send/send-shape.ts`, `send-morph.ts` and
 * `send-flight.css`, plus `tokens.json` `--dsh-claude-duration-flight`
 * (400ms) and `--dsh-claude-duration-enter` (320ms).
 *
 * The web skin grows one composer card continuously into one bubble: it
 * works out the shape's whole timeline at take-off (the shell's width,
 * radius, left/top, the words' width and line height at each sample) and
 * hands it to the compositor. `clip-path` is measured out because it will
 * not composite, so the shape is a `transform: scale` on a shell with a
 * reciprocal `scale` inside that puts the content back to its exact
 * visual size. The real row hides while the stand-in flies, because the
 * host's echo lives ~159ms and the real row takes over a second.
 *
 * The DOM morph and the text re-flow are web-only. This is the
 * transform-only reimplementation: the sent bubble scales about its own
 * bottom-right corner (the side it was sent from) over 400ms with the
 * measured enter easing, and the inner content counter-scales so the
 * words never squash. No layout is written during the flight; the row
 * keeps its box and nothing beside it moves.
 */

import { DSH_DURATION, DSH_EASE } from "@/styles/motion";

/** The whole flight's duration, from `--dsh-claude-duration-flight`. */
export const SEND_FLIGHT_MS = DSH_DURATION.flight;
/** The grow-where-it-lands duration, from `--dsh-claude-duration-enter`. */
export const SEND_ENTER_MS = DSH_DURATION.enter;
/** The flight's easing, `--dsh-claude-ease-enter`. */
export const SEND_FLIGHT_EASE = DSH_EASE.enter;

/** The corner the bubble grows about: its own bottom-right, the sent side. */
export const SEND_GROW_ORIGIN = "100% 100%" as const;

/**
 * The shell scale at one moment of the flight. 0 is the composer, 1 is the
 * landed bubble. Mirrors `chatSendMorphProgress`: the width eases on the
 * same curve the source measures, so the shape and the growth agree.
 */
export function sendFlightScale(u: number): number {
  const clamped = Math.min(1, Math.max(0, u));
  const [x1, y1, x2] = SEND_FLIGHT_EASE;
  return clamped * clamped * (x2 * clamped + y1 + (x2 - x1) * clamped);
}

/** The reciprocal inner scale that restores the words' exact visual size. */
export function sendFlightInnerScale(u: number): number {
  const scale = sendFlightScale(u);
  return scale <= 0 ? 1 : 1 / scale;
}
