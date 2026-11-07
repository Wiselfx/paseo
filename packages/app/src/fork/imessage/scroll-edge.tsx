/**
 * Fork (imessage): the page-colour scroll-edge wash above the transcript.
 *
 * The nav bar's own background stays transparent (see `nav-bar.tsx`): the device
 * instead draws a wash between the scrolling transcript and the floating bar.
 * Measured from `ios-scroll-edge.tsx` in the reference kit — a straight linear
 * ramp toward the page colour, not an ease.
 *
 * | | full | zero |
 * | - | - | - |
 * | light | 62.85 | 160.39 |
 * | dark | 89.17 | 171.71 |
 *
 * Two stops are enough because the ramp is linear; anything above `full` is the
 * status bar's own ground.
 */
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

/** Page-colour wash, `t = 1` at `full` and `t = 0` at `zero`, in screen points from the top. */
export const SCROLL_EDGE_STOPS = {
  light: { full: 62.85, zero: 160.39 },
  dark: { full: 89.17, zero: 171.71 },
} as const;

/** The box is always as tall as the lower zero point; past the light zero the wash is transparent, so the extra dark span costs nothing. */
export const SCROLL_EDGE_HEIGHT = Math.max(
  SCROLL_EDGE_STOPS.light.zero,
  SCROLL_EDGE_STOPS.dark.zero,
);

interface ScrollEdgeSvgProps {
  gradientId: string;
  color: string;
  full: number;
  zero: number;
  height: number;
}

function ScrollEdgeSvg({ gradientId, color, full, zero, height }: ScrollEdgeSvgProps) {
  return (
    <Svg width="100%" height={height} viewBox={`0 0 1 ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2={height}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={full} stopColor={color} stopOpacity={1} />
          <Stop offset={zero} stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height={height} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

const ThemedScrollEdgeSvg = withUnistyles(ScrollEdgeSvg);

/** The measured page-colour wash, theme-aware. */
export const scrollEdgeColor = (
  theme: Theme,
): { color: string; full: number; zero: number } => {
  const appearance = theme.colorScheme === "dark" ? "dark" : "light";
  const stops = SCROLL_EDGE_STOPS[appearance];
  // The palette's page colours are exactly what the reference kit's `--im-bg` is.
  return {
    color: appearance === "dark" ? "#000000" : "#FFFFFF",
    full: stops.full,
    zero: stops.zero,
  };
};

interface ScrollEdgeProps {
  /** Pins one ramp instead of following the current theme. The two are measured separately and differ. */
  appearance?: "light" | "dark";
}

/**
 * The wash, as one element. It sits above the transcript and below the bar's
 * glass, and it is `pointerEvents="none"` so a bubble under it stays pressable.
 */
export function ScrollEdge({ appearance }: ScrollEdgeProps) {
  const style = useMemo(
    () => ({
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      height: SCROLL_EDGE_HEIGHT,
    }),
    [],
  );

  if (appearance) {
    const stops = SCROLL_EDGE_STOPS[appearance];
    // Pinned appearance: no theme lookup needed.
    return (
      <View style={style} pointerEvents="none">
        <ScrollEdgeSvg
          gradientId={`scroll-edge-${appearance}`}
          color={appearance === "dark" ? "#000000" : "#FFFFFF"}
          full={stops.full}
          zero={stops.zero}
          height={SCROLL_EDGE_HEIGHT}
        />
      </View>
    );
  }

  return (
    <View style={style} pointerEvents="none">
      <ThemedScrollEdgeSvg
        gradientId="scroll-edge"
        height={SCROLL_EDGE_HEIGHT}
        uniProps={scrollEdgeColor}
      />
    </View>
  );
}
