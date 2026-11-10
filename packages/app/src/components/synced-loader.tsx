import { useLayoutEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  makeMutable,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
import { useRetainedPanelActive } from "@/components/retained-panel";
import { CLAUDE_EASE } from "@/styles/claude-tokens";
import {
  SYNCED_LOADER_DOT_COUNT,
  getSyncedLoaderDotOpacity,
  getSyncedLoaderStep,
} from "@/components/synced-loader-state";

const GRID_COLUMNS = 2;
const DOT_KEYS = Array.from({ length: SYNCED_LOADER_DOT_COUNT }, (_, i) => `dot-${i}`);

/** The live waiting line: three clay dots bouncing in place, one after another. */
const WAITING_DOT_COUNT = 3;
const WAITING_DOT_SIZE = 4;
const WAITING_DOT_GAP = 3.5;
const WAITING_CYCLE_MS = 1900;
const WAITING_BOUNCE_MS = 500;
const WAITING_STAGGER_MS = 160;
const WAITING_LIFT = 3;
const WAITING_REST_OPACITY = 0.55;
const WAITING_REDUCED_OPACITY = 0.75;
const WAITING_DOT_KEYS = Array.from({ length: WAITING_DOT_COUNT }, (_, i) => `waiting-${i}`);
const sharedStep = makeMutable(0);
const activeLoaderCount = makeMutable(0);
const clockRunning = makeMutable(false);
let nextStepListenerId = 1;

function advanceSharedStep(): void {
  "worklet";
  if (activeLoaderCount.value === 0) {
    clockRunning.value = false;
    return;
  }

  const nextStep = getSyncedLoaderStep(Date.now());
  if (sharedStep.value !== nextStep) {
    sharedStep.value = nextStep;
  }
  requestAnimationFrame(advanceSharedStep);
}

function registerStepListener(
  step: SharedValue<number>,
  registered: SharedValue<boolean>,
  listenerId: number,
): void {
  "worklet";
  if (registered.value) {
    return;
  }

  registered.value = true;
  step.value = getSyncedLoaderStep(Date.now());
  sharedStep.addListener(listenerId, (nextStep) => {
    step.value = nextStep;
  });
  activeLoaderCount.value += 1;

  if (!clockRunning.value) {
    clockRunning.value = true;
    sharedStep.value = step.value;
    requestAnimationFrame(advanceSharedStep);
  }
}

function unregisterStepListener(registered: SharedValue<boolean>, listenerId: number): void {
  "worklet";
  if (!registered.value) {
    return;
  }

  registered.value = false;
  sharedStep.removeListener(listenerId);
  activeLoaderCount.value -= 1;
}

function useSyncedLoaderStep(active: boolean, reduceMotion: boolean): SharedValue<number> {
  // The local value lets retained loaders detach from the app-wide clock without
  // unmounting their animated views or leaving hidden style worklets subscribed.
  const step = useSharedValue(reduceMotion ? 0 : getSyncedLoaderStep(Date.now()));
  const registered = useSharedValue(false);
  const [listenerId] = useState(() => nextStepListenerId++);

  useLayoutEffect(() => {
    if (!active || reduceMotion) {
      return;
    }

    scheduleOnUI(registerStepListener, step, registered, listenerId);
    return () => {
      scheduleOnUI(unregisterStepListener, registered, listenerId);
    };
  }, [active, listenerId, reduceMotion, registered, step]);

  return step;
}

export function SyncedLoader({
  size = 10,
  color,
  variant = "grid",
}: {
  size?: number;
  color: string;
  /**
   * `grid` is the app-wide six-dot sync mark. `waiting` is the conversation's live line:
   * three clay dots bouncing in sequence while a turn runs.
   */
  variant?: "grid" | "waiting";
}) {
  if (variant === "waiting") {
    return <WaitingDots color={color} />;
  }
  return <GridLoader size={size} color={color} />;
}

function WaitingDots({ color }: { color: string }) {
  const active = useRetainedPanelActive();
  const reduceMotion = useReducedMotion();

  const containerStyle = useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: WAITING_DOT_GAP,
      height: WAITING_DOT_SIZE,
    }),
    [],
  );

  return (
    <View style={containerStyle}>
      {WAITING_DOT_KEYS.map((key, index) => (
        <WaitingDot
          key={key}
          index={index}
          color={color}
          animate={active && !reduceMotion}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

function WaitingDot({
  index,
  color,
  animate,
  reduceMotion,
}: {
  index: number;
  color: string;
  animate: boolean;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(0);

  useLayoutEffect(() => {
    if (!animate) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(
      index * WAITING_STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: WAITING_BOUNCE_MS / 2,
            easing: Easing.bezier(...CLAUDE_EASE.out),
          }),
          withTiming(0, {
            duration: WAITING_BOUNCE_MS / 2,
            easing: Easing.bezier(...CLAUDE_EASE.out),
          }),
          // Hold the dot still for the rest of the cycle, so the bounce reads as a
          // beat instead of a loop.
          withTiming(0, { duration: WAITING_CYCLE_MS - WAITING_BOUNCE_MS }),
        ),
        -1,
        false,
      ),
    );
  }, [animate, index, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion || !animate) {
      return { opacity: WAITING_REDUCED_OPACITY, transform: [{ translateY: 0 }] };
    }
    const lift = progress.value;
    return {
      opacity: WAITING_REST_OPACITY + (1 - WAITING_REST_OPACITY) * lift,
      transform: [{ translateY: -WAITING_LIFT * lift }],
    };
  });

  const dotStyle = useMemo(
    () => [
      animatedStyle,
      {
        width: WAITING_DOT_SIZE,
        height: WAITING_DOT_SIZE,
        borderRadius: WAITING_DOT_SIZE / 2,
        backgroundColor: color,
      },
    ],
    [animatedStyle, color],
  );

  return <Animated.View style={dotStyle} />;
}

function GridLoader({ size, color }: { size: number; color: string }) {
  const active = useRetainedPanelActive();
  const reduceMotion = useReducedMotion();
  const step = useSyncedLoaderStep(active, reduceMotion);

  // The 2x3 grid fills `size` exactly on its long axis: the dot is whatever is left after
  // the two gaps, not a floored integer. Flooring cost the grid up to a third of a dot per
  // row — at size 10 it drew 8pt of ink in a 10pt box and read as a small mark in a large
  // slot. Fractional dots are fine here; these are sub-pixel radii on a moving glyph.
  const gap = Math.max(1, Math.round(size * 0.12));
  const dotSize = Math.max(2, (size - gap * 2) / 3);
  const gridWidth = dotSize * 2 + gap;
  const gridHeight = dotSize * 3 + gap * 2;

  const gridStyle = useMemo(
    () => ({ width: gridWidth, height: gridHeight }),
    [gridHeight, gridWidth],
  );
  const containerStyle = useMemo(
    () =>
      ({
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }) as const,
    [size],
  );

  return (
    <View style={containerStyle}>
      <View style={gridStyle}>
        {Array.from({ length: SYNCED_LOADER_DOT_COUNT }).map((_, dotIndex) => {
          const rowIndex = Math.floor(dotIndex / GRID_COLUMNS);
          const columnIndex = dotIndex % GRID_COLUMNS;

          return (
            <SpinnerDot
              key={DOT_KEYS[dotIndex]}
              color={color}
              dotSize={dotSize}
              dotIndex={dotIndex}
              step={step}
              left={columnIndex * (dotSize + gap)}
              top={rowIndex * (dotSize + gap)}
            />
          );
        })}
      </View>
    </View>
  );
}

function SpinnerDot({
  color,
  dotSize,
  dotIndex,
  step,
  left,
  top,
}: {
  color: string;
  dotSize: number;
  dotIndex: number;
  step: SharedValue<number>;
  left: number;
  top: number;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: getSyncedLoaderDotOpacity(step.value, dotIndex),
  }));

  const dotStyle = useMemo(
    () => [
      animatedStyle,
      {
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: color,
        position: "absolute" as const,
        left,
        top,
      },
    ],
    [animatedStyle, dotSize, color, left, top],
  );

  return <Animated.View style={dotStyle} />;
}
