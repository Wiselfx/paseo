import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { switchGeometryForLayout, type SwitchGeometry } from "@/components/ui/control-geometry";
import { focusRingStyle, isKeyboardFocusVisible } from "@/components/ui/focus-ring";
import { CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";
import { useContainedControlSize } from "@/components/ui/control-size";
import { useIsCompactFormFactor } from "@/constants/layout";
import type { Theme } from "@/styles/theme";

interface SwitchProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const THUMB_EASING = Easing.bezier(
  CLAUDE_EASE.out[0],
  CLAUDE_EASE.out[1],
  CLAUDE_EASE.out[2],
  CLAUDE_EASE.out[3],
);

interface SwitchTrackProps {
  value: boolean;
  geometry: SwitchGeometry;
  trackOffColor: string;
  trackOnColor: string;
  thumbOffColor: string;
  thumbOnColor: string;
  reducedMotion: boolean;
}

function SwitchTrack({
  value,
  geometry,
  trackOffColor,
  trackOnColor,
  thumbOffColor,
  thumbOnColor,
  reducedMotion,
}: SwitchTrackProps) {
  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, {
      duration: reducedMotion ? 0 : CLAUDE_DURATION.feedback,
      easing: THUMB_EASING,
    }),
  );

  const trackAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [trackOffColor, trackOnColor]),
  }));

  const { thumbTravel } = geometry;
  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [thumbOffColor, thumbOnColor]),
    transform: [{ translateX: progress.value * thumbTravel }],
  }));

  const trackSize = useMemo(
    () => ({
      width: geometry.trackWidth,
      height: geometry.trackHeight,
      borderRadius: geometry.trackHeight / 2,
      padding: (geometry.trackHeight - geometry.thumbSize) / 2,
    }),
    [geometry],
  );
  const thumbSize = useMemo(
    () => ({
      width: geometry.thumbSize,
      height: geometry.thumbSize,
      borderRadius: geometry.thumbSize / 2,
    }),
    [geometry],
  );
  const trackStyle = useMemo(
    () => [styles.switchTrack, trackSize, trackAnimatedStyle],
    [trackSize, trackAnimatedStyle],
  );
  const thumbStyle = useMemo(
    () => [thumbSize, styles.thumb, thumbAnimatedStyle],
    [thumbSize, thumbAnimatedStyle],
  );

  return (
    <Animated.View style={trackStyle}>
      <Animated.View style={thumbStyle} />
    </Animated.View>
  );
}

const ThemedSwitchTrack = withUnistyles(SwitchTrack, (theme: Theme) => ({
  trackOffColor: theme.colors.surface3,
  trackOnColor: theme.colors.accent,
  thumbOffColor: theme.colors.palette.white,
  thumbOnColor: theme.colors.accentForeground,
}));

export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: SwitchProps) {
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      if (disabled) return;
      onValueChange?.(!value);
    },
    [disabled, onValueChange, value],
  );

  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const size = useContainedControlSize() ?? "md";
  const isCompact = useIsCompactFormFactor();
  const geometry = useMemo(() => switchGeometryForLayout(size, isCompact), [size, isCompact]);

  const accessibilityState = useMemo(() => ({ checked: value, disabled }), [value, disabled]);
  const pressableStyle = useMemo(
    () => [
      styles.switchControl,
      { minHeight: geometry.reservedHeight },
      style,
      focused ? focusRingStyle() : null,
      disabled ? styles.disabled : null,
    ],
    [disabled, geometry.reservedHeight, style, focused],
  );
  const handleFocus = useCallback(() => {
    if (isKeyboardFocusVisible()) setFocused(true);
  }, []);
  const handleBlur = useCallback(() => setFocused(false), []);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      aria-checked={value}
      testID={testID}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={pressableStyle}
    >
      <ThemedSwitchTrack value={value} geometry={geometry} reducedMotion={reducedMotion} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => {
  return {
    switchControl: {
      justifyContent: "center",
    },
    switchTrack: {
      justifyContent: "center",
    },
    thumb: {
      shadowColor: "rgba(0, 0, 0, 0.25)",
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      shadowOpacity: 1,
      elevation: 2,
    },
    disabled: {
      opacity: theme.opacity[50],
    },
  };
});
