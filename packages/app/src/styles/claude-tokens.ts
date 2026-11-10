/**
 * Claude tokens.
 *
 * Values come from the runtime-verified OCU scan of Claude's desktop app
 * (`refs/specs/ocu-spec.md`, confidence [R] unless marked otherwise). Behaviour
 * and motion roles come from the DSH Claude Style plugin; where the two disagree
 * the runtime-verified value wins.
 *
 * `theme.ts` composes these into the default light and dark themes. Surfaces read
 * colours through semantic tokens, never from this file — it is imported by the
 * theme builders and by motion helpers only.
 */

/** Palette shared by both schemes. Anything scheme-specific lives in the two cards. */
const claudeCommon = {
  /** The one accent: brand mark, send, primary CTA. Both schemes. */
  brand: "#d97757",
  /** Pressed brand. */
  brandStrong: "#c6613f",
  /** Focus ring blue, light. */
  focusRing: "#2a78d6",
  focusRingGlow: "#cde2fb",
  /** Status inks are ours; OCU specifies none. */
  successInkLight: "#3b8b4f",
  successInkDark: "#6faf7e",
  failureInkLight: "#c0453a",
  failureInkDark: "#e5675c",
} as const;

/**
 * Light card. Canvas and sidebar are two steps apart; cards sit on white.
 * Alpha borders are ink at 10%; dividers are ink at 5% (OCU §1).
 */
export const claudeLightCard = {
  ...claudeCommon,
  canvas: "#fcfcfb",
  sidebar: "#f9f9f7",
  panel: "#ffffff",
  raised: "#f5f4f1",
  bubble: "#f0efec",
  bubbleFlat: "#f0efec",
  chip: "rgba(255, 255, 255, 0.10)",
  hover: "rgba(11, 11, 11, 0.04)",
  selected: "rgba(11, 11, 11, 0.06)",
  pressed: "rgba(11, 11, 11, 0.09)",
  input: "#ffffff",
  code: "#f7f6f3",
  ink: "#0b0b0b",
  ink2: "#52514e",
  ink3: "#898781",
  ink4: "#b2acad",
  accentInk: "#184f95",
  accentBorder: "#86b6ef",
  border: "rgba(11, 11, 11, 0.10)",
  borderStrong: "rgba(11, 11, 11, 0.16)",
  divider: "rgba(22, 22, 22, 0.05)",
  skeletonBase: "rgba(11, 11, 11, 0.05)",
  skeletonSheen: "rgba(11, 11, 11, 0.05)",
  /** `0 8px 24px #0000001f, 0 2px 6px #00000014` — OCU §1. */
  popoverShadow: "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
  composerShadow: "0 4px 12px rgba(20, 20, 19, 0.04), 0 1px 3px rgba(20, 20, 19, 0.02)",
  scrim: "rgba(0, 0, 0, 0.25)",
} as const;

/**
 * Dark card. Near-black canvas, darker sidebar, one raised step for cards and a
 * warmer top step for the composer. Borders are a 10% white highlight, not a
 * colour.
 */
export const claudeDarkCard = {
  ...claudeCommon,
  canvas: "#151515",
  sidebar: "#0b0b0b",
  panel: "#1a1a19",
  raised: "#262625",
  bubble: "rgba(255, 255, 255, 0.06)",
  bubbleFlat: "#202020",
  chip: "rgba(255, 255, 255, 0.10)",
  hover: "rgba(255, 255, 255, 0.05)",
  selected: "rgba(255, 255, 255, 0.08)",
  pressed: "rgba(255, 255, 255, 0.12)",
  input: "#20201f",
  code: "#0d0d0c",
  ink: "#f0efec",
  ink2: "#c3c2b7",
  ink3: "#898781",
  ink4: "#776f71",
  accentInk: "#6da7ec",
  accentBorder: "#0d366b",
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  divider: "rgba(255, 255, 255, 0.06)",
  skeletonBase: "rgba(255, 255, 255, 0.075)",
  skeletonSheen: "rgba(255, 255, 255, 0.075)",
  /** `0 8px 24px #00000052, 0 2px 6px #0003` — OCU §1. */
  popoverShadow: "0 8px 24px rgba(0, 0, 0, 0.32), 0 2px 6px rgba(0, 0, 0, 0.20)",
  composerShadow: "0 4px 12px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.15)",
  scrim: "rgba(0, 0, 0, 0.55)",
} as const;

export type ClaudeCard = typeof claudeLightCard | typeof claudeDarkCard;

/**
 * Shape ladder — OCU §2. `control` is the base control radius (8 comfortable,
 * 6 compact); `card` is a card (12); `composer` an expanded composer (14);
 * `bubble` a sent message (18); `sheet` a dialog (16).
 */
export const CLAUDE_RADIUS = {
  xs: 2,
  sm: 4,
  md: 6,
  control: 8,
  card: 12,
  composer: 14,
  sheet: 16,
  bubble: 18,
  full: 9999,
} as const;

/**
 * Motion — OCU §5 [R] durations and easings. DSH motion roles are expressed with
 * these values: a reveal is `snap`, a surface `base`, an opening sheet `sheet`.
 * A role with no OCU counterpart (`step`, `roll`) keeps DSH's own value.
 */
export const CLAUDE_DURATION = {
  /** Caret, smallest feedback. */
  instant: 60,
  /** A control answering press or hover; a chat body entering; a fold. */
  feedback: 120,
  reveal: 120,
  /** A wording swap half. */
  swap: 150,
  /** Something travelling along its own track; a message's fade-up. */
  move: 200,
  base: 200,
  /** A menu or dialog opening, a sheet arriving. */
  open: 250,
  sheet: 300,
  /** A slow cross-fade. */
  slow: 450,
  /** One step of the reasoning window. */
  step: 500,
  /** A count's digits rolling over. */
  roll: 160,
} as const;

/** Control points, for `Easing.bezier(...)`. */
export const CLAUDE_EASE = {
  /** Arriving and settling: reveals, folds, message entrance. */
  out: [0.165, 0.84, 0.44, 1] as const,
  /** Surfaces whose anchor they grow out of. */
  snap: [0.32, 0.72, 0, 1] as const,
  /** A small pop only: the sent message, a pill. Never a surface crossing the screen. */
  overshoot: [0.34, 1.3, 0.64, 1] as const,
  /** Digits rolling over. */
  roll: [0.4, 0, 0.2, 1] as const,
} as const;

/** Distances the motion language uses. */
export const CLAUDE_DISTANCE = {
  /** A surface rising into place, a wording swap. */
  nudge: 4,
  /** The waiting line's swap travel, the message fade-up. */
  travel: 8,
  /** A line of the greeting rising. */
  rise: 12,
} as const;
