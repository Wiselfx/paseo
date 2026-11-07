/**
 * Claude-style rolling fold, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/chat-fold/fold-glide.ts`
 *
 * The web skin intercepts the toggle in the capture phase so React never
 * unmounts the body: the body stays mounted while its height is pressed
 * down, content below is really pushed away, and only then is the click
 * handed back. The door rolls only what can be seen — the visible stretch
 * gets `--dsh-claude-duration-roll` and the offscreen remainder takes the
 * rest in one go, so a 200px and a 20 000px body move at the same speed in
 * front of the reader.
 *
 * React Native has no capture-phase click interception that keeps a
 * virtualized list from unmounting rows, so the fold cannot press height
 * against a mounted body here. What ports cleanly is the contract:
 *
 * - the toggle stays behind the existing disclosure hold, so the trigger
 *   keeps its screen position through the change (the hold already does
 *   this via `viewport.holdRow`);
 * - the open/close is a height roll driven by the measured roll easing
 *   (`cubic-bezier(0.4, 0, 0.2, 1)`) at 300ms, not an instant swap;
 * - the roll distance is the visible reach, so tall bodies move with the
 *   same on-screen speed as short ones.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DSH_DURATION, DSH_EASE } from "@/styles/motion";

/** The roll's own duration, from `tokens.json` `--dsh-claude-duration-roll`. */
export const FOLD_ROLL_MS = DSH_DURATION.roll;
/** The roll's easing, `--dsh-claude-ease-roll`. */
export const FOLD_ROLL_EASE = Easing.bezier(...DSH_EASE.roll);

/**
 * The share of the roll the reader sees, from `fold-glide-parts.ts`
 * (`FOLD_VISIBLE_SHARE`). The visible stretch gets this share of the
 * duration; the rest rides along so the whole height still travels.
 */
export const FOLD_VISIBLE_SHARE = 0.6;

/**
 * The visible reach the roll travels: caps the on-screen distance so a
 * 20 000px body and a 200px body move at the same speed in front of the
 * reader. Falls back to the full height when the viewport is unknown.
 */
export function foldRollReach(fullHeight: number, viewportHeight: number): number {
  if (!Number.isFinite(fullHeight) || fullHeight <= 0) return 0;
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return fullHeight;
  return Math.min(fullHeight, viewportHeight);
}

export interface RollingFoldProps {
  /** Whether the body is open. Controlled by the disclosure hold. */
  open: boolean;
  /** The body that rolls. Rendered only while open; the hold keeps the trigger pinned. */
  children: ReactNode;
  /** Share of the full height that is on screen. Defaults to the whole body. */
  visibleShare?: number;
  testID?: string;
}

/**
 * A height roll for a disclosure body. The body mounts while open; closing
 * runs the roll before the parent unmounts it. If the parent unmounts
 * instantly, the roll is skipped and the hold still keeps the trigger in
 * place — the roll is the polish, not the correctness.
 */
export function RollingFold({ open, children, visibleShare = 1, testID }: RollingFoldProps) {
  const [fullHeight, setFullHeight] = useState(0);
  const progress = useSharedValue(open ? 1 : 0);
  const reach = useMemo(
    () => foldRollReach(fullHeight, fullHeight > 0 ? fullHeight : 0),
    [fullHeight],
  );
  const visible = useMemo(() => reach * visibleShare, [reach, visibleShare]);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: FOLD_ROLL_MS, easing: FOLD_ROLL_EASE });
  }, [open, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, progress.value);
    return {
      height: travel * fullHeight,
      opacity: Math.min(1, travel * 1.4),
      transform: [{ translateY: (1 - travel) * 8 }],
    };
  }, [fullHeight]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0 && next !== fullHeight) setFullHeight(next);
  }, [fullHeight]);

  const innerStyle = useMemo(
    () => ({ overflow: "hidden" as const, height: fullHeight > 0 ? visible : undefined }),
    [fullHeight, visible],
  );

  if (!open && progress.value === 0) return null;

  return (
    <Animated.View
      testID={testID}
      style={animatedStyle}
      onLayout={onLayout}
      pointerEvents={open ? "auto" : "none"}
    >
      <View style={innerStyle}>{children}</View>
    </Animated.View>
  );
}
