/**
 * Claude-style send grow and badge pop, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/shared/motion.css` (`dsh-claude-enter-grow`),
 * `packages/client/src/features/chat-send/send-flight.css`, and
 * `tokens.json` `--dsh-claude-duration-enter` (320ms),
 * `--dsh-claude-duration-pop` (500ms).
 *
 * The web skin grows a sent message where it lands: `transform-origin:
 * 100% 100%; animation: dsh-claude-enter-grow 320ms
 * cubic-bezier(0.34, 1.3, 0.64, 1) both`, where `dsh-claude-enter-grow` is
 * `from { transform: scale(0) } to { transform: scale(1) }`. The whole
 * effect is a scale about the bubble's own bottom-right corner (the side
 * it was sent from), so nothing beside the message moves — the row keeps
 * its box and the transcript does not reflow. The flight's stand-in ghost
 * (a DOM clone flown from the composer) is web-only; this is the
 * transform-only reimplementation the source recommends when the clone is
 * unavailable.
 *
 * The badge pop (`--dsh-claude-duration-pop`, 500ms) is the same growth at
 * the badge's own duration: something popping into place.
 */

import { useCallback, useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "react-native-reanimated";
import { DSH_DURATION, DSH_EASE } from "@/styles/motion";

/** The growth duration, `--dsh-claude-duration-enter`. */
export const SEND_GROW_MS = DSH_DURATION.enter;
/** The growth easing, `--dsh-claude-ease-enter`. */
export const SEND_GROW_EASE = Easing.bezier(...DSH_EASE.enter);
/** The badge pop duration, `--dsh-claude-duration-pop`. */
export const POP_MS = DSH_DURATION.pop;

/**
 * A sent message growing into its row about its own bottom-right corner.
 * The row keeps its box; nothing beside it moves.
 */
export function SendGrow({ children, testID }: { children: ReactNode; testID?: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return undefined;
    }
    progress.value = withTiming(1, { duration: SEND_GROW_MS, easing: SEND_GROW_EASE });
    return undefined;
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, progress.value) }] }));
  const innerRef = useCallback(() => undefined, []);

  return (
    <Animated.View testID={testID} style={animatedStyle}>
      <View ref={innerRef}>{children}</View>
    </Animated.View>
  );
}

/** The same growth at the badge's own duration: 500ms. */
export function PopIn({ children, testID }: { children: ReactNode; testID?: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return undefined;
    }
    progress.value = withTiming(1, { duration: POP_MS, easing: SEND_GROW_EASE });
    return undefined;
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, progress.value) }] }));

  return (
    <Animated.View testID={testID} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
