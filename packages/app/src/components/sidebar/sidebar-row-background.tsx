import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

interface RowBackgroundColors {
  hoverColor: string;
  selectedColor: string;
  pressedColor: string;
}

/**
 * The row's interaction wash, painted behind its content. It is a layer rather than a
 * `backgroundColor` on the pressable so the change can be timed: a row answers hover and press
 * over `CLAUDE_DURATION.feedback`, and reduced motion answers at once. Precedence follows the
 * pressable's own state array — pressed, then selected, then hovered.
 */
function SidebarRowBackgroundInner({
  hovered = false,
  selected = false,
  pressed = false,
  radius,
  hoverColor,
  selectedColor,
  pressedColor,
}: RowBackgroundColors & {
  hovered?: boolean;
  selected?: boolean;
  pressed?: boolean;
  /** Corner radius, for a row whose box is rounder than a control. Defaults to a control's 8. */
  radius?: number;
}) {
  const reduceMotion = useReducedMotion();
  const target = resolveBackgroundColor({
    hovered,
    selected,
    pressed,
    hoverColor,
    selectedColor,
    pressedColor,
  });
  const backgroundColor = useSharedValue(target);
  useEffect(() => {
    backgroundColor.value = withTiming(target, {
      duration: reduceMotion ? 0 : CLAUDE_DURATION.feedback,
      easing: Easing.bezier(
        CLAUDE_EASE.out[0],
        CLAUDE_EASE.out[1],
        CLAUDE_EASE.out[2],
        CLAUDE_EASE.out[3],
      ),
    });
  }, [backgroundColor, reduceMotion, target]);
  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: backgroundColor.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fill, radius === undefined ? null : { borderRadius: radius }, animatedStyle]}
    />
  );
}

function resolveBackgroundColor({
  hovered,
  selected,
  pressed,
  hoverColor,
  selectedColor,
  pressedColor,
}: RowBackgroundColors & { hovered: boolean; selected: boolean; pressed: boolean }) {
  if (pressed) return pressedColor;
  if (selected) return selectedColor;
  if (hovered) return hoverColor;
  return TRANSPARENT;
}

export const SidebarRowBackground = withUnistyles(SidebarRowBackgroundInner, (theme) => ({
  hoverColor: theme.colors.hover,
  selectedColor: theme.colors.selected,
  pressedColor: theme.colors.pressed,
}));

const styles = StyleSheet.create((theme) => ({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: theme.borderRadius.control,
  },
}));
