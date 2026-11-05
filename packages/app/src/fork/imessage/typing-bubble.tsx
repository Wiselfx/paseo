/**
 * Fork (imessage): the typing bubble, and the arrival animation for a bubble.
 *
 * The typing bubble is the whole visible story while the model works: nothing
 * else is shown, so it has to carry "something is happening" on its own. Three
 * dots breathing, plus irregular ticks from `senses` — irregular on purpose, a
 * metronome reads as a machine and a machine reads as stuck.
 *
 * Arrival is transform-and-opacity only (scale from 0.92 with a small overshoot),
 * which is what lets the compositor run it without touching layout.
 */
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { tickSenses } from "./senses";

const DOT_COUNT = 3;
const DOT_PERIOD_MS = 900;
/** Mean gap between ticks; jittered by ±JITTER_MS so it never sounds metronomic. */
const TICK_GAP_MS = 210;
const TICK_JITTER_MS = 70;

const DOT_KEYS = Array.from({ length: DOT_COUNT }, (_, index) => `dot-${index}`);

function Dot({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const delay = (index * DOT_PERIOD_MS) / (DOT_COUNT * 2);
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: DOT_PERIOD_MS / 2 }), -1, true),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.34 + progress.value * 0.66,
    transform: [{ translateY: -progress.value * 2 }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

/**
 * Ticks while the model works.
 *
 * @param active - false stops the sound without unmounting the bubble.
 */
function useTypingTicks(active: boolean): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const schedule = () => {
      const jitter = (Math.random() * 2 - 1) * TICK_JITTER_MS;
      timer.current = setTimeout(() => {
        if (cancelled) return;
        tickSenses();
        schedule();
      }, Math.max(60, TICK_GAP_MS + jitter));
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [active]);
}

export interface TypingBubbleProps {
  /** Keep ticking; false while the turn has finished but the bubble has not left yet. */
  ticking?: boolean;
}

export function TypingBubble({ ticking = true }: TypingBubbleProps) {
  useTypingTicks(ticking);
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <View style={styles.dots}>
          {DOT_KEYS.map((key, index) => (
            <Dot key={key} index={index} />
          ))}
        </View>
      </View>
    </View>
  );
}

export interface PoppingProps {
  children: React.ReactNode;
}

/** Wraps a bubble so it arrives instead of appearing. */
export function Popping({ children }: PoppingProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 15, stiffness: 260, mass: 0.9 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const eased = Math.min(1, progress.value);
    return {
      opacity: Math.min(1, progress.value * 2),
      transform: [
        { scale: 0.92 + eased * 0.08 },
        { translateY: (1 - eased) * 6 },
      ],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create((theme) => {
  const isDark = theme.colorScheme === "dark";
  return {
    row: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "flex-start",
    },
    bubble: {
      backgroundColor: isDark ? "#26252A" : "#E9E9EB",
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dots: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      height: 8,
      // Web needs an explicit baseline shift for the translateY to show.
      ...(Platform.OS === "web" ? { overflow: "visible" as const } : {}),
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: isDark ? "#8E8E93" : "#8A8A8E",
    },
  };
});
