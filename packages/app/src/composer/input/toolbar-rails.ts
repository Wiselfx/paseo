import {
  TOOLBAR_CONTROL_SIZES,
  TOOLBAR_LABEL_PADDING,
  toolbarGlyphsFor,
  type ControlSizing,
} from "@/components/ui/control-geometry";
import { bySizing } from "@/components/ui/control-sizing";

/** The control at one end of the composer toolbar, which decides how far the row hangs out. */
export type ComposerToolbarEdge = "attach" | "label" | "disc" | "none";

/**
 * The composer's padding. Its sides are the rails: the text column and the toolbar's outer
 * controls both start there.
 */
const COMPOSER_PADDING = { top: 9, horizontal: 14, bottom: 2 } as const;

export const COMPOSER_PADDING_TOP = COMPOSER_PADDING.top;
export const COMPOSER_PADDING_HORIZONTAL = COMPOSER_PADDING.horizontal;
export const COMPOSER_PADDING_BOTTOM = COMPOSER_PADDING.bottom;

/**
 * The plate a composer rail control paints. The row keeps its full touch height so the
 * composer still reads as a surface you can hit, but the ink is one small disc on both
 * sizings; the disc, not the row, is what the trailing corner is built around.
 */
export const COMPOSER_RAIL_DISC_SIZE = 28;

/** A pointer-sized send disc is a rounded square, not a circle; a compact one is a circle. */
export const COMPOSER_RAIL_RADIUS = COMPOSER_RAIL_DISC_SIZE / 4;

/** The plus glyph's ink: 14 of Lucide's 24 units, plus its stroke. */
function attachGlyphInkWidth(sizing: ControlSizing): number {
  const glyph = toolbarGlyphsFor(sizing).icon;
  return (14 * glyph.size) / 24 + glyph.strokeWidth;
}

/**
 * The disc's distance from the composer's bottom edge: the rail's bottom padding plus the
 * slack left in a row taller than the disc.
 */
function discEdgeInset(sizing: ControlSizing): number {
  return COMPOSER_PADDING.bottom + (TOOLBAR_CONTROL_SIZES[sizing] - COMPOSER_RAIL_DISC_SIZE) / 2;
}

/** A pointer-sized row is exactly the disc, so its controls hang by the half-glyph slack. */
const POINTER_OVERHANG = (COMPOSER_RAIL_DISC_SIZE - toolbarGlyphsFor("pointer").icon.size) / 2;

/**
 * A trailing disc nests into the composer's corner: it reaches past the rail until it sits as far
 * from the right edge as from the bottom edge.
 */
const TOUCH_DISC_NEST = COMPOSER_PADDING.horizontal - discEdgeInset("touch");

/** Touch-sized the composer's corner is concentric with the disc nested in it. */
export const COMPOSER_CORNER_RADIUS = bySizing({
  touch: COMPOSER_RAIL_DISC_SIZE / 2 + discEdgeInset("touch"),
  pointer: COMPOSER_RAIL_DISC_SIZE / 2 + discEdgeInset("pointer"),
});

/**
 * Touch-sized each end control's highlight hangs past the rail far enough to put what it paints on
 * the rail. The trailing disc paints its whole highlight, so it nests into the corner instead.
 */
const TOUCH_OVERHANGS: Record<ComposerToolbarEdge, number> = {
  attach: (COMPOSER_RAIL_DISC_SIZE - attachGlyphInkWidth("touch")) / 2,
  label: TOOLBAR_LABEL_PADDING,
  disc: TOUCH_DISC_NEST,
  none: 0,
};

/** How far the composer toolbar hangs past the text column at one end. */
export function composerToolbarOverhang(edge: ComposerToolbarEdge, sizing: ControlSizing): number {
  return sizing === "pointer" ? POINTER_OVERHANG : TOUCH_OVERHANGS[edge];
}

/** The control that starts the toolbar on the left. */
export function resolveComposerLeadingEdge(input: {
  showsAttach: boolean;
  showsAgentControls: boolean;
}): ComposerToolbarEdge {
  if (input.showsAttach) return "attach";
  if (input.showsAgentControls) return "label";
  return "none";
}
