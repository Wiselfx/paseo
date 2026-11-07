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
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { Theme } from "@/styles/theme";

import { Gesture, GestureDetector } from "react-native-gesture-handler";

import {
  type MessageActionsRequest,
  type Rect,
  useOptionalMessageActions,
} from "./message-actions";
import { EmojiPicker } from "./emoji-picker";
import type { ContextMenuItem } from "./menu";
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

/**
 * Which measured fill to paint. Alignment always follows `side`; the tone is separate because
 * Messages draws a file card as a *grey* balloon in both directions — your own included.
 */
export type BubbleTone = "auto" | "grey";

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
function toneSurface(side: BubbleSide, tone: BubbleTone): BubbleSide {
  return tone === "grey" ? "agent" : side;
}

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
  tone: BubbleTone;
  tail: boolean;
  padding: { x: number; y: number };
  children: ReactNode;
  testID?: string;
}

function BubbleOutline({ side, tone, tail, padding, children, testID }: BubbleOutlineProps) {
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
      uniProps={surfaceProps(toneSurface(side, tone), outline !== null)}
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
            <ThemedPath d={outline} uniProps={fillProps(toneSurface(side, tone))} />
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
  /** `grey` paints the incoming fill while keeping this bubble's alignment (file cards). */
  tone?: BubbleTone;
  /** Whether this bubble ends its group — only then does the tail face the speaker. */
  tail?: boolean;
  children: ReactNode;
  /** Fired on a plain tap, after the press animation has already started. */
  onPress?: () => void;
  /** Runs a menu row from the long-press overlay. */
  onAction?: (id: string) => void;
  /** Rows the overlay offers for this bubble. Defaults to Copy. */
  menuItems?: ContextMenuItem[];
  /**
   * Identifies this bubble in the reaction store. With a key, the bubble can take a
   * tapback and show it; without one it is inert in the overlay.
   */
  reactionKey?: string;
  /** A static render (the typing balloon, the lifted copy) takes no presses. */
  interactive?: boolean;
  /** False while text selection owns the long press, so the menu cannot steal it. */
  menuEnabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Override the default 13.85/10 text padding (the typing balloon needs less). */
  contentPadding?: { x: number; y: number };
}

export const ChatBubble = memo(function ChatBubble({
  side,
  tone = "auto",
  tail = true,
  children,
  onPress,
  onAction,
  menuItems,
  reactionKey,
  interactive = true,
  menuEnabled = true,
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
  const [emojiOpen, setEmojiOpen] = useState(false);

  const washing = bubblePalette(side, "light").background;

  const openActions = useCallback(
    (rect: Rect) => {
      if (!actions || reactionKey === undefined) return;
      const lifted = (
        <View style={[styles.liftedFrame, { width: rect.width }]}>
          <BubbleOutline side={side} tone={tone} tail={tail} padding={padding}>
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
        items: menuItems,
        selected: reactionToSelection(reaction),
        onSelect: (selection) => setReaction(reactionKey, selection),
        onAction,
        onPickEmoji: () => setEmojiOpen(true),
      };
      actions.open(request);
    },
    [actions, reactionKey, side, tone, tail, padding, children, washing, reaction, onAction, menuItems],
  );

  const closeEmojiPicker = useCallback(() => setEmojiOpen(false), []);
  const pickEmoji = useCallback(
    (emoji: string) => {
      setEmojiOpen(false);
      actions?.close();
      if (reactionKey !== undefined) setReaction(reactionKey, { emoji });
    },
    [actions, reactionKey],
  );

  const handleLongPress = useCallback(() => {
    const node = host.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      openActions({ x, y, width, height });
    });
  }, [openActions]);

  const runPress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const gesture = useMemo(() => {
    // One touch-down acknowledgement for both outcomes: the long press begins tracking on the
    // first touch, so its `onBegin` is the press state. The tap must not also fire it, or a
    // touch-down would tick twice.
    const longPress = Gesture.LongPress()
      .minDuration(LONG_PRESS_MS)
      .maxDistance(MOVE_TOLERANCE)
      .enabled(interactive && menuEnabled)
      .onBegin(() => runOnJS(onPressIn)())
      .onStart(() => {
        if (actions) runOnJS(handleLongPress)();
      })
      .onFinalize(() => runOnJS(onPressOut)());
    const tap = Gesture.Tap()
      .maxDistance(MOVE_TOLERANCE)
      .onBegin(() => {
        if (!menuEnabled) runOnJS(onPressIn)();
      })
      .onEnd((_event, success) => {
        if (success) runOnJS(runPress)();
      })
      .onFinalize(() => runOnJS(onPressOut)());
    // First to activate wins: a release before 500ms is a tap, a 500ms hold cancels the tap.
    return Gesture.Race(longPress, tap);
  }, [actions, handleLongPress, interactive, menuEnabled, onPressIn, onPressOut, runPress]);

  // Accessibility owner is the gesture host View below; the inner Animated.View no longer
  // carries its own label to avoid double announcements.
  const content = (
    <Animated.View style={[styles.frame, pressStyle, style]}>
      <BubbleOutline side={side} tone={tone} tail={tail} padding={padding} testID={testID}>
        {children}
      </BubbleOutline>
    </Animated.View>
  );

  const pressable = (
    <View style={[styles.row, side === "user" ? styles.rowUser : styles.rowAgent]}>
      <GestureDetector gesture={gesture}>
        <View
          ref={host}
          collapsable={false}
          style={styles.shrink}
          accessible={onPress !== undefined || accessibilityLabel !== undefined}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel={accessibilityLabel}
          onAccessibilityTap={onPress ? runPress : undefined}
        >
          {content}
        </View>
      </GestureDetector>
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

  const contentNode = reaction ? <View style={styles.slot}>{pressable}</View> : pressable;

  return (
    <>
      {contentNode}
      {emojiOpen ? <EmojiPicker onSelect={pickEmoji} onClose={closeEmojiPicker} /> : null}
    </>
  );
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
    maxWidth: BUBBLE_MAX_WIDTH,
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
}));
