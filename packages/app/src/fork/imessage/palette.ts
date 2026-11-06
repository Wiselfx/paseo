/**
 * Fork (imessage): the measured Messages palette.
 *
 * These are not "a blue" and "a grey". They are the colours iOS 26 Messages
 * actually paints, taken from `CKUITheme balloonColorsForColorType:` and
 * confirmed against device captures (see `theswerd/imessage-ui` `tokens.ts`, MIT):
 *
 * - outgoing blue is a screen-space ramp, #5ac8fa at the top of the screen to
 *   #0088ff at the bottom in light, #409cff → #0091ff in dark;
 * - incoming grey is flat #e9e9eb light, #262629 dark — not a guess, the same
 *   pair the tapback balloon uses;
 * - text is pure white on blue and pure black on light grey, and the
 *   "Delivered" label is #8a8a8e / #8d8d93.
 *
 * Identity is not a theme: blue is you, grey is them, in both appearances.
 *
 * ## Why the ramp is flattened here
 *
 * The real fill is keyed to the *screen*, so a bubble passing up the list drifts
 * lighter (`use-screen-space.ts`). Reproducing that needs the scroll offset on
 * every bubble, and at a 40pt bubble the whole ramp is a 4/255 channel shift —
 * invisible. Flattening to the midpoint is indistinguishable on text bubbles and
 * exact on tall ones only in the sense of being off by ±2/255 at the top and
 * bottom edges; the endpoints are kept below so a screen-space fill can be
 * dropped in later without touching call sites.
 */

export type Appearance = "light" | "dark";
export type BubbleSideName = "user" | "agent";

export interface ScreenGradient {
  top: string;
  bottom: string;
  /** Reference screen height the ramp was measured on, in points. */
  screenHeight: number;
}

export interface MeasuredPalette {
  background: string;
  imessage: ScreenGradient;
  incoming: string;
  incomingText: string;
  outgoingText: string;
  secondaryLabel: string;
  tapbackMine: string;
  tapbackTheirs: string;
  separator: string;
  /** The composed flat fill of the outgoing bubble. */
  outgoing: string;
}

export const MESSAGES_PALETTE: Record<Appearance, MeasuredPalette> = {
  light: {
    background: "#FFFFFF",
    imessage: { top: "#5AC8FA", bottom: "#0088FF", screenHeight: 874 },
    incoming: "#E9E9EB",
    incomingText: "#000000",
    outgoingText: "#FFFFFF",
    secondaryLabel: "#8A8A8E",
    tapbackMine: "#0088FF",
    tapbackTheirs: "#E9E9EB",
    separator: "#C6C6C8",
    outgoing: "#2EA8FC",
  },
  dark: {
    background: "#000000",
    imessage: { top: "#409CFF", bottom: "#0091FF", screenHeight: 874 },
    incoming: "#262629",
    incomingText: "#FFFFFF",
    outgoingText: "#FFFFFF",
    secondaryLabel: "#8D8D93",
    tapbackMine: "#0088FF",
    tapbackTheirs: "#3B3B3D",
    separator: "#38383A",
    outgoing: "#2197FF",
  },
};

export interface BubblePalette {
  /** Bubble body. */
  background: string;
  /** The tail SVG, which must match the body exactly. */
  tail: string;
  /** Text that sits on it. */
  foreground: string;
  /** Dots / secondary marks inside the bubble. */
  muted: string;
  /** The screen-space endpoints this flat fill stands in for. */
  gradient: ScreenGradient;
}

export function bubblePalette(side: BubbleSideName, appearance: Appearance): BubblePalette {
  const palette = MESSAGES_PALETTE[appearance];
  if (side === "user") {
    return {
      background: palette.outgoing,
      tail: palette.outgoing,
      foreground: palette.outgoingText,
      muted: "rgba(255,255,255,0.7)",
      gradient: palette.imessage,
    };
  }
  return {
    background: palette.incoming,
    tail: palette.incoming,
    foreground: palette.incomingText,
    muted: palette.secondaryLabel,
    gradient: { top: palette.incoming, bottom: palette.incoming, screenHeight: 874 },
  };
}

/** Relative luminance, sRGB, 0 = black. Kept for surfaces that only know a colour. */
export function relativeLuminance(color: string): number {
  const hex = color.trim().replace(/^#/, "");
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex.slice(0, 6);
  if (expanded.length !== 6) return 0;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
  if (channels.some((channel) => Number.isNaN(channel))) return 0;
  const [r, g, b] = channels.map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightSurface(background: string): boolean {
  return relativeLuminance(background) > 0.35;
}
