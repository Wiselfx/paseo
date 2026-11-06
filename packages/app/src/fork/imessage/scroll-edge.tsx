/**
 * Fork (imessage): the wash iOS 26 lays over messages scrolling under the nav bar.
 *
 * The bar has no background of its own — the controls float — so without this a
 * bubble arrives behind the glyphs at full contrast and collides with them. Device
 * captures (`ios-scroll-edge.tsx` in the reference kit) solve the effect as a
 * straight line in screen `y` from the bubble colour toward the page colour:
 *
 * - light: t = 1 at y 62.85, t = 0 at y 160.39;
 * - dark:  t = 1 at y 89.17, t = 0 at y 171.71.
 *
 * The two themes genuinely differ (dark lets go 11pt lower over a shorter span),
 * which is why the ramps are keyed by appearance rather than shared.
 *
 * iOS also blurs progressively here; the captures cannot separate blur from wash
 * because they hold no sharp glyph inside the ramp, and no capture shows the blur
 * on iOS the way the macOS one does. So this draws the measured half — the wash —
 * and nothing that was guessed.
 */
import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { MESSAGES_PALETTE, type Appearance } from "./palette";

export const IOS_SCROLL_EDGE = {
  light: { full: 62.85, zero: 160.39 },
  dark: { full: 89.17, zero: 171.71 },
} as const;

/** Tall enough for both appearances; past `zero` the gradient is transparent anyway. */
const WASH_HEIGHT = Math.max(IOS_SCROLL_EDGE.light.zero, IOS_SCROLL_EDGE.dark.zero);

const ThemedStop = withUnistyles(Stop);

const fullStop = (theme: Theme) => ({ stopColor: MESSAGES_PALETTE[theme.colorScheme].background });

function Wash({ id, appearance }: { id: string; appearance: Appearance }) {
  const ramp = IOS_SCROLL_EDGE[appearance];
  return (
    <Svg
      pointerEvents="none"
      style={styles.wash}
      width="100%"
      height={WASH_HEIGHT}
      viewBox={`0 0 1 ${WASH_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <SvgLinearGradient
          id={id}
          x1="0"
          y1="0"
          x2="0"
          y2={WASH_HEIGHT}
          gradientUnits="userSpaceOnUse"
        >
          <ThemedStop offset={ramp.full / WASH_HEIGHT} stopOpacity={1} uniProps={fullStop} />
          <ThemedStop offset={ramp.zero / WASH_HEIGHT} stopOpacity={0} uniProps={fullStop} />
          <ThemedStop offset={1} stopOpacity={0} uniProps={fullStop} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height={WASH_HEIGHT} fill={`url(#${id})`} />
    </Svg>
  );
}

const ThemedWash = withUnistyles(Wash);

const appearanceProps = (theme: Theme) => ({ appearance: theme.colorScheme });

export function ScrollEdgeWash() {
  // A `#wash` id is not unique when a tablet shows two conversations side by side.
  const id = `wash${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return <ThemedWash id={id} uniProps={appearanceProps} />;
}

const styles = StyleSheet.create({
  wash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
