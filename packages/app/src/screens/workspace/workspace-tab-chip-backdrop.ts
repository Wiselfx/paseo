import type { SurfaceBackdrop } from "@/styles/surface-backdrop";

/** The surface a tab rail paints: a pane header or the Explorer sidebar. */
export type WorkspaceTabRailSurface = "surface" | "sidebar";

/**
 * The surface behind a tab chip, named as the token a knockout matches.
 *
 * A knockout has to fill itself with the colour behind it, so this names the chip's own opaque
 * fill: the card of an active chip, the sidebar's hover plate, or the rail at rest. The pane
 * rail's hover state is the translucent `hover` tint laid over the rail, which no surface token
 * can name, so it rests on the rail itself. The sidebar rail climbs its own ladder because light
 * themes paint `surfaceSidebar` with `surface2`, so a `surface1` chip would vanish on it.
 */
export function resolveWorkspaceTabChipSurface({
  rail,
  isActive,
  isHovered,
}: {
  rail: WorkspaceTabRailSurface;
  isActive: boolean;
  isHovered: boolean;
}): SurfaceBackdrop {
  if (rail === "sidebar") {
    if (isActive) return "surfaceSidebarSelected";
    return isHovered ? "surfaceSidebarHover" : "surfaceSidebar";
  }
  return isActive ? "surface1" : "surface0";
}
