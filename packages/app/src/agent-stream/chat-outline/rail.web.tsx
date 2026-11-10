import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Pressable, Text, View, type PointerEvent as RNPointerEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { useContainerWidthBelow } from "@/hooks/use-container-width";
import { CLAUDE_DISTANCE, CLAUDE_DURATION, CLAUDE_EASE } from "@/styles/claude-tokens";
import { createChatOutlineHoverIntent } from "./hover-intent";
import { isOutlineNeighborhood } from "./model";
import type { ChatOutlineRailProps } from "./rail";

// Hover tracking lives on the rail and the slots, never on the tick inside them: a
// hovering pointer must not move the box it is resting on. See docs/hover.md.
const RAIL_WIDTH = 28;
const RAIL_MAX_HEIGHT = 240;
const SLOT_HEIGHT = 6;
const MIN_PANEL_WIDTH = 918;
const TICK_WIDTH = 20;
const TICK_HEIGHT = 2;
const ACTIVE_TICK_HEIGHT = 3;
const PREVIEW_WIDTH = 288;
const PREVIEW_GAP = 8;

export const ChatOutlineRail = memo(function ChatOutlineRail({
  prompts,
  activePrompt,
  onJumpToPrompt,
}: ChatOutlineRailProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const activeSeq = useSyncExternalStore(activePrompt.subscribe, activePrompt.getActiveSeq);
  const prefersReducedMotion = useReducedMotion();
  const { onLayout, isBelow: isPanelNarrow } = useContainerWidthBelow(MIN_PANEL_WIDTH);

  const hoverIntent = useMemo(
    () =>
      createChatOutlineHoverIntent({
        activate: setHoveredIndex,
        schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
        cancel: (timerId) => window.clearTimeout(timerId),
      }),
    [],
  );
  const handlePointerEnterTick = useCallback(
    (index: number) => hoverIntent.pointAt(index),
    [hoverIntent],
  );
  const handlePointerEnterRail = useCallback(
    (event: RNPointerEvent) => {
      hoverIntent.enter({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
    },
    [hoverIntent],
  );
  const handlePointerMoveRail = useCallback(
    (event: RNPointerEvent) => {
      hoverIntent.move({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
    },
    [hoverIntent],
  );
  const handlePointerLeaveRail = useCallback(() => hoverIntent.leave(), [hoverIntent]);
  useEffect(() => () => hoverIntent.dispose(), [hoverIntent]);
  useEffect(() => {
    if (isPanelNarrow) hoverIntent.leave();
  }, [hoverIntent, isPanelNarrow]);
  const handleFocusChange = useCallback((index: number, focused: boolean) => {
    setFocusedIndex((current) => {
      if (focused) return index;
      return current === index ? null : current;
    });
  }, []);

  // The pointer owns the inked band while it is on the rail; keyboard focus drives the
  // same band and the same preview once the pointer leaves.
  const attentionIndex = hoveredIndex ?? focusedIndex;

  if (prompts.length < 2) return null;

  return (
    <View style={styles.panelMeasure} pointerEvents="box-none" onLayout={onLayout}>
      {isPanelNarrow ? null : (
        <View
          style={styles.rail}
          role="tablist"
          testID="chat-outline-rail"
          onPointerEnter={handlePointerEnterRail}
          onPointerMove={handlePointerMoveRail}
          onPointerLeave={handlePointerLeaveRail}
        >
          <View style={styles.track}>
            {prompts.map((prompt, index) => (
              <ChatOutlineTick
                key={prompt.seq}
                index={index}
                seq={prompt.seq}
                preview={prompt.preview}
                label={`${index + 1} of ${prompts.length}: ${prompt.preview}`}
                isActive={prompt.seq === activeSeq}
                hasAttention={index === attentionIndex}
                inNeighborhood={
                  attentionIndex !== null && isOutlineNeighborhood(index - attentionIndex)
                }
                instant={prefersReducedMotion}
                onHover={handlePointerEnterTick}
                onFocusChange={handleFocusChange}
                onJumpToPrompt={onJumpToPrompt}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

interface ChatOutlineTickProps {
  index: number;
  seq: number;
  preview: string;
  label: string;
  isActive: boolean;
  hasAttention: boolean;
  inNeighborhood: boolean;
  instant: boolean;
  onHover: (index: number) => void;
  onFocusChange: (index: number, focused: boolean) => void;
  onJumpToPrompt: (seq: number) => void;
}

const ChatOutlineTick = memo(function ChatOutlineTick({
  index,
  seq,
  preview,
  label,
  isActive,
  hasAttention,
  inNeighborhood,
  instant,
  onHover,
  onFocusChange,
  onJumpToPrompt,
}: ChatOutlineTickProps) {
  const handlePress = useCallback(() => {
    onJumpToPrompt(seq);
    onFocusChange(index, false);
  }, [index, onFocusChange, onJumpToPrompt, seq]);
  const handlePointerEnter = useCallback(() => onHover(index), [index, onHover]);
  const handleFocus = useCallback(() => onFocusChange(index, true), [index, onFocusChange]);
  const handleBlur = useCallback(() => onFocusChange(index, false), [index, onFocusChange]);

  return (
    <View style={styles.slot} onPointerEnter={handlePointerEnter}>
      <Pressable
        style={styles.target}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityRole="tab"
        aria-selected={isActive}
        accessibilityLabel={label}
        testID={`chat-outline-tick-${seq}`}
      >
        <View
          style={[
            styles.tick,
            inNeighborhood && styles.tickNeighborhood,
            isActive && styles.tickActive,
            instant && styles.tickInstant,
          ]}
        />
      </Pressable>
      {hasAttention ? <ChatOutlinePreview preview={preview} /> : null}
    </View>
  );
});

/** The prompt card does not exist until the pointer has settled on a tick, so it fades in
 * from short of its seat; reduced motion keeps the fade and drops the travel. */
function ChatOutlinePreview({ preview }: { preview: string }) {
  const prefersReducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: CLAUDE_DURATION.feedback,
      easing: Easing.bezier(
        CLAUDE_EASE.out[0],
        CLAUDE_EASE.out[1],
        CLAUDE_EASE.out[2],
        CLAUDE_EASE.out[3],
      ),
    });
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: prefersReducedMotion ? 0 : CLAUDE_DISTANCE.nudge * (1 - progress.value),
      },
    ],
  }));
  return (
    <View style={styles.previewAnchor} pointerEvents="none">
      <Animated.View
        style={[styles.preview, animatedStyle]}
        aria-hidden
        testID="chat-outline-preview"
      >
        <Text style={styles.previewText} numberOfLines={2}>
          {preview}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  panelMeasure: {
    position: "absolute",
    inset: 0,
  },
  // The rail takes the 32px inset it needs to stay clear of the pane's own chrome, and the
  // 240px cap is the band DSH gives ten turns. A long conversation squeezes the slots instead
  // of running past the cap, so every prompt stays reachable.
  rail: {
    position: "absolute",
    right: theme.spacing[3],
    top: theme.spacing[8],
    bottom: theme.spacing[8],
    width: RAIL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  track: {
    width: "100%",
    maxHeight: RAIL_MAX_HEIGHT,
    flexShrink: 1,
  },
  // Slots tile the track, so every pixel of the column belongs to a prompt even when a long
  // conversation squeezes them well below their resting height.
  slot: {
    width: "100%",
    flexBasis: SLOT_HEIGHT,
    minHeight: ACTIVE_TICK_HEIGHT,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  target: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.base,
  },
  // Ticks rest at the hairline so the column stays readable peripherally without competing
  // with the transcript. The neighbourhood inks, and the turn being read grows and takes ink.
  tick: {
    width: TICK_WIDTH,
    height: TICK_HEIGHT,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
    _web: {
      transitionProperty: "height, background-color",
      transitionDuration: `${CLAUDE_DURATION.feedback}ms`,
      transitionTimingFunction: `cubic-bezier(${CLAUDE_EASE.out.join(", ")})`,
    },
  },
  tickNeighborhood: {
    backgroundColor: theme.colors.foregroundExtraMuted,
  },
  tickActive: {
    height: ACTIVE_TICK_HEIGHT,
    backgroundColor: theme.colors.foreground,
  },
  tickInstant: {
    _web: { transitionProperty: "none" },
  },
  // The card sits left of the rail and centres on its tick without measuring: the anchor owns
  // the slot's full height and flex-centres the card inside it.
  previewAnchor: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: RAIL_WIDTH + PREVIEW_GAP,
    justifyContent: "center",
  },
  preview: {
    width: PREVIEW_WIDTH,
    padding: 10,
    borderRadius: theme.borderRadius.card,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface1,
    ...theme.shadow.md,
  },
  previewText: {
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
    color: theme.colors.foregroundMuted,
  },
}));
