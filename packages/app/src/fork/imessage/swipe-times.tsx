/**
 * Fork (imessage): "swipe left to reveal times" — the transcript drawer.
 *
 * Measured from `ios-swipe-times.tsx`:
 *
 * - every bubble shifts left by exactly **58** (the last bubble's body right edge goes 386 → 328);
 * - the per-message time is 11pt secondary (#8a8a8e light / #8d8d93 dark), right-aligned with its
 *   ink ending 16 from the screen's trailing edge, and its ink is centred on the bubble body's
 *   centre;
 * - ChatKit's own numbers agree: `transcriptDrawerGestureAcceleration` 1 (the drawer tracks the
 *   finger one to one), `transcriptDrawerFont` 11pt, `drawerTranscriptTextAttributes` right
 *   aligned, `transcriptDrawerSpace` 8;
 * - a release runs a ~300ms spring (ζ 0.9, ω 20 → damping 36, stiffness 400 here) and peeks back
 *   rather than latching, because `hideTranscriptTimestampsIfNeeded` holds the drawer open only
 *   while the gesture does.
 *
 * The gesture lives on every row but drives one shared value, so a drag anywhere moves the whole
 * column the way the native drawer does. It commits only to the horizontal axis (8pt of travel)
 * and fails on vertical travel, so the transcript keeps its scroll.
 */
import { memo, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  makeMutable,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { MESSAGES_PALETTE } from "./palette";

export const swipeTimesMetrics = {
  distance: 58,
  timeInset: 16,
  fontSize: 11,
  lineHeight: 13,
  letterSpacing: 0.1,
} as const;

const SLOP = 8;
const SPRING = { damping: 36, stiffness: 400, mass: 1 } as const;

/** One drawer for the whole transcript: every row reads and writes this. */
const offset = makeMutable(0);

function rubberBand(value: number): number {
  if (value > 0) return value * 0.25;
  const limit = swipeTimesMetrics.distance;
  if (value < -limit) return -limit - (Math.abs(value) - limit) * 0.25;
  return value;
}

const TIME_TEXT = {
  fontSize: swipeTimesMetrics.fontSize,
  lineHeight: swipeTimesMetrics.lineHeight,
  letterSpacing: swipeTimesMetrics.letterSpacing,
} as const;

interface TimeLabelProps {
  color: string;
  label: string;
}

function TimeLabel({ color, label }: TimeLabelProps) {
  const style = useMemo(() => [TIME_TEXT, { color }], [color]);
  return (
    <Text
      style={style}
      numberOfLines={1}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {label}
    </Text>
  );
}

const ThemedTimeLabel = withUnistyles(TimeLabel);

const timeTheme = (theme: Theme) => ({
  color: MESSAGES_PALETTE[theme.colorScheme].secondaryLabel,
});

export interface SwipeTimesRowProps {
  /** The message's clock time, already formatted ("1:25 AM"). */
  time: string;
  children: ReactNode;
}

export const SwipeTimesRow = memo(function SwipeTimesRow({ time, children }: SwipeTimesRowProps) {
  const pan = Gesture.Pan()
    .activeOffsetX([-SLOP, SLOP])
    .failOffsetY([-SLOP, SLOP])
    .onUpdate((event) => {
      offset.value = rubberBand(event.translationX);
    })
    .onEnd(() => {
      offset.value = withSpring(0, SPRING);
    });

  const shift = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const reveal = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(offset.value) / swipeTimesMetrics.distance),
  }));

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.time, reveal]}>
        <ThemedTimeLabel label={time} uniProps={timeTheme} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={shift}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  time: {
    position: "absolute",
    right: swipeTimesMetrics.timeInset,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
});
