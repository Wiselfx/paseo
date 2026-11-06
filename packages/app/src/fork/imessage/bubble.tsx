/**
 * Fork (imessage): the chat bubble itself.
 *
 * Two identities, one geometry — the same rule iMessage uses. Blue and
 * right-aligned means "you"; grey and left-aligned means "them".
 *
 * The silhouette is measured, not approximated: `shape.ts` carries the Béziers
 * traced off iOS 26 Messages, so the tail's neck cuts into the body and ends in a
 * point below it. Drawing the whole outline as one SVG path — instead of a rounded
 * View plus a tail patch — is also what removes the hairline seam where two shapes
 * meet on a non-integer pixel boundary.
 *
 * A bubble is also an object: it gives under a finger on touch-down, springs back
 * on release, and long-press lifts it into a menu. The press has to land on the
 * same frame as the touch — a delayed press is the difference between "responsive"
 * and "web app".
 */
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PressHighlight } from "@/components/ui/press-highlight";
import type { Theme } from "@/styles/theme";

import { bubblePalette } from "./palette";
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

export type BubbleSide = "user" | "agent";

const PRESS_SCALE = 0.97;
const PRESS_IN = { damping: 22, stiffness: 420, mass: 0.5 } as const;
const PRESS_OUT = { damping: 14, stiffness: 260, mass: 0.7 } as const;

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
  return (theme: Theme) => ({ fill: bubblePalette(side, theme.colors.background).tail });
}

function surfaceProps(side: BubbleSide, transparent: boolean) {
  return (theme: Theme) => ({
    color: transparent ? "transparent" : bubblePalette(side, theme.colors.background).background,
  });
}

const DEFAULT_PADDING = { x: BUBBLE_PADDING_X, y: BUBBLE_PADDING_Y } as const;

function tailSideFor(side: BubbleSide, tail: boolean): "left" | "right" | "none" {
  if (!tail) return "none";
  return side === "user" ? "right" : "left";
}

function usePressFeedback() {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    // Haptic on the way down, never on release: the finger wants to know it landed.
    touchSenses();
    scale.value = withSpring(PRESS_SCALE, PRESS_IN);
  }, [scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_OUT);
  }, [scale]);

  return { pressStyle, onPressIn, onPressOut };
}

interface BubbleOutlineProps {
  side: BubbleSide;
  /** Whether the tail faces the speaker. */
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
    () => (size && bodyHeight > 0 ? bubblePath(size.width, bodyHeight, tailSide, BUBBLE_RADIUS) : null),
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
        <Svg
          pointerEvents="none"
          style={styles.fill}
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
        >
          <ThemedPath d={outline} uniProps={fillProps(side)} />
        </Svg>
      ) : null}
      {children}
    </ThemedSurface>
  );
}

export interface ChatBubbleProps {
  side: BubbleSide;
  /** Whether this bubble ends its group — only then does the tail face the speaker. */
  tail?: boolean;
  children: ReactNode;
  /** Menu content, opened by long-press (and right click on web). */
  menu?: ReactNode;
  /** Fired on a plain tap, after the press animation has already started. */
  onPress?: () => void;
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
  menu,
  onPress,
  accessibilityLabel,
  testID,
  style,
  contentPadding,
}: ChatBubbleProps) {
  const { pressStyle, onPressIn, onPressOut } = usePressFeedback();
  const padding = contentPadding ?? DEFAULT_PADDING;

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

  return (
    <View style={[styles.row, side === "user" ? styles.rowUser : styles.rowAgent]}>
      {menu ? (
        <ContextMenu>
          {/* A menu needs the trigger that knows how to open it. */}
          <ContextMenuTrigger
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onPress}
            style={styles.shrink}
          >
            {content}
          </ContextMenuTrigger>
          <ContextMenuContent>{menu}</ContextMenuContent>
        </ContextMenu>
      ) : (
        // Without a menu the bubble is still tappable, but it must not mount a menu
        // trigger that has no menu to open.
        <PressHighlight
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onPress}
          style={styles.shrink}
          highlightStyle={styles.noHighlight}
          accessibilityRole={onPress ? "button" : undefined}
        >
          {content}
        </PressHighlight>
      )}
    </View>
  );
});

const styles = StyleSheet.create(() => ({
  row: {
    flexDirection: "row",
    width: "100%",
  },
  rowUser: { justifyContent: "flex-end" },
  rowAgent: { justifyContent: "flex-start" },
  shrink: {
    flexShrink: 1,
    maxWidth: "100%",
  },
  frame: {
    flexShrink: 1,
    maxWidth: BUBBLE_MAX_WIDTH,
    minWidth: BUBBLE_MIN_WIDTH,
  },
  body: {
    borderRadius: BUBBLE_RADIUS,
    flexShrink: 1,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  // The bubble animates its own press scale; a second flash would double it.
  noHighlight: {
    backgroundColor: "transparent",
  },
}));
