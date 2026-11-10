import type { SurfaceBackdrop } from "@/styles/surface-backdrop";

/** The surface a tab rail paints: a pane header or the Explorer sidebar. */
export type WorkspaceTabRailSurface = "surface" | "sidebar";

/**
 * The surface behind a tab chip, named as the token a knockout matches.
 *
 * A knockout has to fill itself with the colour behind it, so this names the chip's own opaque
 * fill: the card of an active chip, the sidebar's hover plate, or the rail at rest. The pane
 * rail's hover state is the translucent `hover` tint laid over the rail, which no surface token
 * can name, so it rests on the rail itself. Both rails use the same card for the active chip, so
 * the sidebar's active tab reads like the pane deck's instead of climbing a darker ladder.
 */
export function resolveWorkspaceTabChipSurface({
  rail,
  isActive,
}: {
  rail: WorkspaceTabRailSurface;
  isActive: boolean;
}): SurfaceBackdrop {
  if (rail === "sidebar") {
    return isActive ? "surface1" : "surfaceSidebar";
  }
  return isActive ? "surface1" : "surface0";
}
