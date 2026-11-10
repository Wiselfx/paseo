import { SidebarRowBackground } from "@/components/sidebar/sidebar-row-background";

/**
 * The highlight behind a sidebar footer icon. It is a layer inside the button rather than a
 * radius on it: web hit-testing follows `border-radius`, so a round button would stop taking taps
 * near the corners of its square finger-sized target. Square with the control's 8px radius, and
 * timed like every other row wash.
 */
export function SidebarFooterIconHighlight({
  hovered,
  pressed,
}: {
  hovered: boolean;
  pressed: boolean;
}) {
  return <SidebarRowBackground hovered={hovered} pressed={pressed} />;
}
