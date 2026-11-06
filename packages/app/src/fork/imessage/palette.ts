/**
 * Fork (imessage): bubble colours, resolved from the surface they sit on.
 *
 * Apple's rule is identity, not theme: blue is you, grey is everyone else, in both
 * appearances. The grey still has to flip, so it needs to know which way up the
 * surface is.
 *
 * That question is answered from the theme's own background rather than from
 * `theme.colorScheme`. In the first draft `colorScheme` was read inside a
 * `StyleSheet.create` callback and light mode came out dark — the bubble matched
 * a palette that was not the one on screen, and the text vanished into it. A
 * luminance read of the background cannot disagree with what is rendered.
 *
 * @param background - A `#rgb` / `#rrggbb` / `#rrggbbaa` colour from the theme.
 */

/** Apple system blue. One value: it reads correctly on white and on near-black. */
export const IMESSAGE_BLUE = "#007AFF";

/** iMessage's received bubble: a grey that flips with the surface. */
export const AGENT_GREY = { light: "#E9E9EB", dark: "#26252A" } as const;

/** Above this relative luminance the surface is light, so the bubble goes dark. */
const DARK_SURFACE_LUMINANCE = 0.35;

function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4) {
    const expanded = hex
      .slice(0, 3)
      .split("")
      .map((digit) => digit + digit)
      .join("");
    return parseHex(`#${expanded}`);
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  if (channels.some((channel) => Number.isNaN(channel))) return null;
  return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0];
}

/** Relative luminance, sRGB, 0 = black. Falls back to "dark" for unparseable input. */
export function relativeLuminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isLightSurface(background: string): boolean {
  return relativeLuminance(background) > DARK_SURFACE_LUMINANCE;
}

export interface BubblePalette {
  /** Bubble body. */
  background: string;
  /** Text that sits on it. */
  foreground: string;
  /** The tail SVG, which must match the body exactly. */
  tail: string;
  /** Dots / secondary marks inside the bubble. */
  muted: string;
}

export function bubblePalette(side: "user" | "agent", surfaceBackground: string): BubblePalette {
  if (side === "user") {
    return {
      background: IMESSAGE_BLUE,
      foreground: "#FFFFFF",
      tail: IMESSAGE_BLUE,
      muted: "rgba(255,255,255,0.7)",
    };
  }
  const light = isLightSurface(surfaceBackground);
  return {
    background: light ? AGENT_GREY.light : AGENT_GREY.dark,
    foreground: light ? "#1A1A1E" : "#F2F2F7",
    tail: light ? AGENT_GREY.light : AGENT_GREY.dark,
    muted: light ? "#8A8A8E" : "#9A9A9F",
  };
}
