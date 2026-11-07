/**
 * Claude-style palette prefs, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/contracts/src/prefs.ts` and
 * `packages/client/src/theme/tokens.json` (`palette` section).
 *
 * Three independent choices:
 * - who paints the colours: the skin's own palette (`claude`) or the host's
 *   colour tokens (`host`);
 * - which colours: one brand's own card, `brand` for whichever brand the
 *   theme chooses, or the reader's four (`paletteColors`);
 * - how the brand art is painted: in its own colours (`original`), in the
 *   accent (`accent`), or as a shape in the text colour (`text`).
 */

export type PaletteWho = "claude" | "host";
export type PaletteColoring = "brand" | "claude" | "deepseek" | "custom";
export type BrandInk = "original" | "accent" | "text";

export const PALETTE_WHO: readonly PaletteWho[] = ["claude", "host"] as const;
export const PALETTE_COLORINGS: readonly PaletteColoring[] = ["brand", "claude", "deepseek", "custom"] as const;
export const BRAND_INKS: readonly BrandInk[] = ["original", "accent", "text"] as const;

/** Which colour card the theme style chooses from. */
export const PALETTE_CARD = {
  claude: {
    accent: "#D97757",
    background: "#FAF9F5",
    foreground: "#1F1E1D",
    muted: "#6B6660",
  },
  deepseek: {
    accent: "#4D6BFE",
    background: "#FFFFFF",
    foreground: "#1A1B1F",
    muted: "#6B7280",
  },
} as const;

/** The host's own tokens when `palette: host`. */
export interface PaletteCard {
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

