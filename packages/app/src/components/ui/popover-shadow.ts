/**
 * DSH popover shadows. The theme's generic shadow steps are softer and shorter
 * than a menu's, so the two values live here, once, and every floating surface
 * reads them instead of restating the rgba pairs.
 */
export const POPOVER_SHADOW = {
  light: "0 10px 32px rgba(20, 20, 19, 0.16), 0 2px 8px rgba(20, 20, 19, 0.08)",
  dark: "0 8px 28px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.45)",
} as const;

export function popoverShadow(colorScheme: "light" | "dark"): string {
  return colorScheme === "dark" ? POPOVER_SHADOW.dark : POPOVER_SHADOW.light;
}
