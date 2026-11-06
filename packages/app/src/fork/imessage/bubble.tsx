/**
 * Fork (imessage): the chat bubble itself.
 *
 * Two identities, one geometry — the same rule iMessage uses. Blue and right-aligned means
 * "you"; grey and left-aligned means "them", in both appearances.
 *
 * The silhouette is measured, not approximated: `shape.ts` carries the Béziers traced off
 * iOS 26 Messages, so the tail's neck cuts into the body and ends in a point below it.
 * Drawing the whole outline as one SVG path — instead of a rounded View plus a tail patch —
 * is also what removes the hairline seam where two shapes meet on a non-integer pixel.
 *
 * A bubble is an object. It gives under a finger on touch-down, springs back on release, and
 * a 500ms hold opens the long-press overlay (`message-actions.tsx`) with the bubble lifted,
 * the Tapback pill above it and the menu below. The press has to land on the same frame as
 * the touch — a delayed press is the difference between "responsive" and "web app".
 *
 * A tapback is not part of the bubble: it floats over the bubble's top corner 27.39 above it
 * and 13.85 outside it, and the list has to open 28 points of slot for it. Both numbers are
 * measured (`balloonSlot`).
 */
import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { Theme } from "@/styles/theme";

import { PressHighlight } from "@/components/ui/press-highlight";

import {
  type MessageActionsRequest,
  type Rect,
  useOptionalMessageActions,
} from "./message-actions";
import { bubblePalette } from "./palette";
import { setReaction, useReaction, type Reaction } from "./reactions";
import { touchSenses } from "./senses";
import {
  BUBBLE_MAX_WIDTH,
  BUBBLE_MIN_WIDTH,
  BUBBLE_PADDING_X,
  BUBBLE_PADDING_Y,
  BUBBLE_RADIUS,
  TAIL_BOX,
  bubblePath,
} from "./shape";
import type { TapbackSelection } from "./tapback-bar";
import { Tapback, balloonSlot } from "./tapback";

export type BubbleSide = "user" | "agent";

const PRESS_SCALE = 0.97;
const PRESS_IN = { damping: 22, stiffness: 420, mass: 0.5 } as const;
const PRESS_OUT = { damping: 14, stiffness: 260, mass: 0.7 } as const;
/** iOS long-press: a 500ms hold that dies after 8 points of travel. */
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8;

const ThemedPath = withUnistyles(Path);

interface SurfaceProps extends ViewProps {
  /** Injected by Unistyles from the active theme. */
  color: string;
}

/** A background whose colour is a plain prop, so Unistyles can map it from the theme. */
function Surface({ color, style, ...rest }: SurfaceProps) {
  return <View {...rest} style={[style, { backgroundColor: color }]} />;
}
const ThemedSurface = withUnistyles(Surface);

/** Theme callbacks, so Unistyles restyles the bubble without a React re-render. */
function fillProps(side: BubbleSide) {
  return (theme: Theme) => ({ fill: bubblePalette(side, theme.colorScheme).tail });
}

function surfaceProps(side: BubbleSide, transparent: boolean) {
  return (theme: Theme) => ({
    color: transparent ? "transparent" : bubblePalette(side, theme.colorScheme).background,
  });
}

const DEFAULT_PADDING = { x: BUBBLE_PADDING_X, y: BUBBLE_PADDING_Y } as const;

function tailSideFor(side: BubbleSide, tail: boolean): "left" | "right" | "none" {
  if (!tail) return "none";
  return side === "user" ? "right" : "left";
}

interface BubbleOutlineProps {
  side: BubbleSide;
  tail: boolean;
  padding: { x: number; y: number };
  children: ReactNode;
  testID?: string;
}

function BubbleOutline({ side, tail, padding, children, testID }: BubbleOutlineProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) =>
      previous &&
      Math.abs(previous.width - width) < 0.5 &&
      Math.abs(previous.height - height) < 0.5
        ? previous
        : { width, height },
    );
  }, []);

  const tailSide = tailSideFor(side, tail);
  // The tail hangs below the body, so the body's own height is the frame minus it.
  const bodyHeight = size ? size.height - (tail ? TAIL_BOX.hang : 0) : 0;
  const outline = useMemo(
    () =>
      size && bodyHeight > 0
        ? bubblePath(size.width, bodyHeight, tailSide, BUBBLE_RADIUS)
        : null,
    [bodyHeight, size, tailSide],
  );

  return (
    <ThemedSurface
      style={[
        styles.body,
        {
          paddingHorizontal: padding.x,
          paddingTop: padding.y,
          paddingBottom: padding.y + (tail ? TAIL_BOX.hang : 0),
        },
      ]}
      uniProps={surfaceProps(side, outline !== null)}
      onLayout={measure}
      testID={testID}
    >
      {outline && size ? (
        // The drawing sits in an out-of-flow layer on purpose: a sized Svg that is a
        // laid-out child of the view it is measuring can feed its own size back into
        // `onLayout`, and the bubble grows on every frame. Absolute positioning breaks
        // that loop.
        <View pointerEvents="none" style={styles.overlay}>
          <Svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
            <ThemedPath d={outline} uniProps={fillProps(side)} />
          </Svg>
        </View>
      ) : null}
      {children}
    </ThemedSurface>
  );
}

function usePressFeedback(active: boolean) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    if (!active) return;
    // Haptic on the way down, never on release: the finger wants to know it landed.
    touchSenses();
    scale.value = withSpring(PRESS_SCALE, PRESS_IN);
  }, [active, scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_OUT);
  }, [scale]);

  return { pressStyle, onPressIn, onPressOut };
}

export interface ChatBubbleProps {
  side: BubbleSide;
  /** Whether this bubble ends its group — only then does the tail face the speaker. */
  tail?: boolean;
  children: ReactNode;
  /** Fired on a plain tap, after the press animation has already started. */
  onPress?: () => void;
  /** Runs a menu row from the long-press overlay. */
  onAction?: (id: string) => void;
  /**
   * Identifies this bubble in the reaction store. With a key, the bubble can take a
   * tapback and show it; without one it is inert in the overlay.
   */
  reactionKey?: string;
  /** A static render (the typing balloon, the lifted copy) takes no presses. */
  interactive?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Override the default 13.85/10 text padding (the typing balloon needs less). */
  contentPadding?: { x: number; y: number };
}

export const ChatBubble = memo(function ChatBubble({
  side,
  tail = true,
  children,
  onPress,
  onAction,
  reactionKey,
  interactive = true,
  accessibilityLabel,
  testID,
  style,
  contentPadding,
}: ChatBubbleProps) {
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback(interactive);
  const padding = contentPadding ?? DEFAULT_PADDING;
  const reaction = useReaction(reactionKey);
  const actions = useOptionalMessageActions();
  const host = useRef<View>(null);

  const washing = bubblePalette(side, "light").background;

  const openActions = useCallback(
    (rect: Rect) => {
      if (!actions || reactionKey === undefined) return;
      const lifted = (
        <View style={[styles.liftedFrame, { width: rect.width }]}>
          <BubbleOutline side={side} tail={tail} padding={padding}>
            {children}
          </BubbleOutline>
        </View>
      );
      const request: MessageActionsRequest = {
        rect,
        side,
        tail,
        bubble: lifted,
        wash: washing,
        selected: reactionToSelection(reaction),
        onSelect: (selection) => setReaction(reactionKey, selection),
        onAction,
      };
      actions.open(request);
    },
    [actions, reactionKey, side, tail, padding, children, washing, reaction, onAction],
  );

  const handleLongPress = useCallback(() => {
    const node = host.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      openActions({ x, y, width, height });
    });
  }, [openActions]);

  const content = (
    <Animated.View
      style={[styles.frame, pressStyle, style]}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <BubbleOutline side={side} tail={tail} padding={padding} testID={testID}>
        {children}
      </BubbleOutline>
    </Animated.View>
  );

  const pressable = (
    <View style={[styles.row, side === "user" ? styles.rowUser : styles.rowAgent]}>
      <PressHighlight
        ref={host}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={interactive && actions ? handleLongPress : undefined}
        delayLongPress={LONG_PRESS_MS}
        pressRetentionOffset={MOVE_TOLERANCE}
        style={styles.shrink}
        highlightStyle={styles.noHighlight}
        accessibilityRole={onPress ? "button" : undefined}
      >
        {content}
      </PressHighlight>
      {reaction ? (
        <View
          pointerEvents="none"
          style={[
            styles.reaction,
            side === "user"
              ? { right: balloonSlot.side }
              : { left: balloonSlot.side },
          ]}
        >
          <Tapback
            reaction={"type" in reaction ? reaction.type : undefined}
            emoji={"emoji" in reaction ? reaction.emoji : undefined}
            own
            side={side === "user" ? "left" : "right"}
            animateIn
          />
        </View>
      ) : null}
    </View>
  );

  return reaction ? <View style={styles.slot}>{pressable}</View> : pressable;
});

function reactionToSelection(reaction: Reaction | undefined): TapbackSelection | undefined {
  return reaction;
}

const styles = StyleSheet.create(() => ({
  row: {
    flexDirection: "row",
    width: "100%",
    // A bubble can never be wider than the column it lives in, whatever the text.
    maxWidth: "100%",
  },
  rowUser: { justifyContent: "flex-end" },
  rowAgent: { justifyContent: "flex-start" },
  shrink: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
  },
  frame: {
    flexShrink: 1,
    flexGrow: 0,
    maxWidth: BUBBLE_MAX_WIDTH,
    minWidth: BUBBLE_MIN_WIDTH,
  },
  liftedFrame: {
    alignItems: "flex-start",
  },
  body: {
    borderRadius: BUBBLE_RADIUS,
    flexShrink: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  reaction: {
    position: "absolute",
    top: balloonSlot.top,
  },
  slot: {
    paddingTop: balloonSlot.marginTop,
  },
  // The bubble animates its own press scale; a second flash would double it.
  noHighlight: {
    backgroundColor: "transparent",
  },
}));
