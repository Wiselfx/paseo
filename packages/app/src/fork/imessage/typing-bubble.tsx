/**
 * Fork (imessage): the typing bubble, and the arrival animation for a bubble.
 *
 * The typing bubble is the whole visible story while the model works: nothing
 * else is shown, so it has to carry "something is happening" on its own.
 *
 * Its geometry is not invented. ChatKit reports the balloon at 57.5 × 35 with
 * 8.5pt dots on a 12.5pt pitch, and the pulse is 1.2s — the sizes are measured,
 * the easing is ours. The dots breathe with negative delays so no dot is ever
 * waiting to start: at any instant all three are inside their active phase.
 *
 * Arrival is transform-and-opacity only (scale from 0.92 with a small overshoot,
 * growing out of the tail corner), which is what lets the compositor run it
 * without touching layout.
 */
import { useEffect, useRef } from "react";
import { View } from "react-native";
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
import { ChatBubble } from "./bubble";

/** Measured: `transcriptTypingIndicatorLargeBubbleSize` and its dot metrics. */
const DOT_SIZE = 8.5;
const DOT_PITCH = 12.5;
const DOT_GAP = DOT_PITCH - DOT_SIZE;
/** 57.5 wide with 12pt inset each side; 35 tall with 13.25 above and below the dots. */
const BALLOON_PADDING = { x: 12, y: 13.25 } as const;
const PULSE_MS = 1200;
const DOT_COUNT = 3;

/** Mean gap between ticks; jittered by ±JITTER_MS so it never sounds metronomic. */
const TICK_GAP_MS = 220;
const TICK_JITTER_MS = 80;

const DOT_KEYS = Array.from({ length: DOT_COUNT }, (_, index) => `dot-${index}`);

function Dot({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Negative delays are not available in Reanimated, so each dot starts its own
    // cycle offset by a third of the pulse and the first frames are already moving.
    const delay = (index * PULSE_MS) / (DOT_COUNT * 2);
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: PULSE_MS / 2 }), -1, true),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.32 + progress.value * 0.68,
    transform: [{ translateY: -progress.value * 2.5 }],
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
      }, Math.max(70, TICK_GAP_MS + jitter));
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
      <Popping origin="left">
        <ChatBubble side="agent" contentPadding={BALLOON_PADDING}>
          <View style={styles.dots}>
            {DOT_KEYS.map((key, index) => (
              <Dot key={key} index={index} />
            ))}
          </View>
        </ChatBubble>
      </Popping>
    </View>
  );
}

export interface PoppingProps {
  children: React.ReactNode;
  /** Which corner the bubble grows out of — the tail side. */
  origin?: "left" | "right";
}

/** Wraps a bubble so it arrives instead of appearing. */
export function Popping({ children, origin = "left" }: PoppingProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, { damping: 16, stiffness: 300, mass: 0.8 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const eased = Math.min(1.08, progress.value);
    return {
      opacity: Math.min(1, progress.value * 2),
      transform: [
        { scale: 0.92 + eased * 0.08 },
        { translateY: (1 - eased) * 5 },
      ],
      // Grow out of the tail, not out of the middle.
      transformOrigin: origin === "left" ? "left bottom" : "right bottom",
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create(() => ({
  row: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "flex-start",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#8E8E93",
  },
}));
