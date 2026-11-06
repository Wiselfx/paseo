/**
 * Fork (imessage): the Tapback picker — the six classics plus recent emoji in a glass pill.
 *
 * Ported from `tapback-bar.tsx`. Both halves of the iOS row are confirmed twice, by the
 * capture and by ChatKit, which is why these numbers are safe to translate:
 *
 * - pill height 64.33 (ChatKit's `messageAcknowledgmentPickerBarSize` 74 with its 5 padding
 *   gives 64) and 49-wide slots, the first glyph's centre 32.5 from the pill's left end;
 * - six slots of 49 is 294 and 32.5 − 24.5 = 8 of lead, so the pill is 310 wide with the
 *   trailing spacer repeating it (ChatKit even names the 8: `…ItemSectionPush`);
 * - the emoji-picker thought bubble is the balloon shape at 1.3×, centred 14.67 below the
 *   pill's bottom edge.
 *
 * The reference stretches the pill from the screen margin to the bubble's trailing edge in
 * the long-press overlay; that is what this does too, so the width is a prop.
 */
import { memo, useCallback, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { PressHighlight } from "@/components/ui/press-highlight";
import { GlassSurface } from "./glass";
import { touchSenses } from "./senses";
import {
  pickerBalloonGeometry,
  TapbackGlyph,
  tapbackColors,
  tapbackLabels,
  tapbackTypes,
  type TapbackType,
} from "./tapback";

export const tapbackBarMetrics = {
  height: 64.33,
  slot: 49,
  firstCenter: 32.5,
  glyph: 25.33,
  selectedRing: 44,
  pickerDrop: 14.67,
  edgeInset: 10.83,
  emojiSize: 25,
  /** Six slots plus the repeating 8 at each end: ChatKit's fixed 310. */
  contentWidth: 6 * 49 + 2 * 8,
} as const;

export type TapbackSelection = { type: TapbackType } | { emoji: string };

const DEFAULT_RECENT = ["😂", "❤️", "😮", "😢", "😭", "👍"];

interface Item {
  type?: TapbackType;
  emoji?: string;
  label: string;
  key: string;
}

function isSelected(selection: TapbackSelection | undefined, item: Item): boolean {
  if (!selection) return false;
  return "type" in selection ? selection.type === item.type : selection.emoji === item.emoji;
}

/** SF Symbol "face.smiling" look-alike, an outlined grinning face. */
export function SmileyIcon({
  size = 22,
  color = "#AEAEB2",
  strokeWidth = 1.7,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Circle cx="11" cy="11" r="9.5" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="7.7" cy="8.5" r="1.25" fill={color} />
      <Circle cx="14.3" cy="8.5" r="1.25" fill={color} />
      <Path
        d="M5.4,12.3 H16.6 C16.6,15.7 14.1,18 11,18 C7.9,18 5.4,15.7 5.4,12.3 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth * 0.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The emoji-picker thought bubble: a Ø44 circle merged into the pill with two trailing circles. */
export function EmojiPickerBubble({
  side = "left",
  onPress,
  fill,
  iconColor,
  top,
  left,
}: {
  side?: "left" | "right";
  onPress?: () => void;
  fill: string;
  iconColor: string;
  top: number;
  left: number;
}) {
  const geometry = pickerBalloonGeometry;
  const half = geometry.main / 2;
  const place = (diameter: number, [dx, dy]: [number, number]) => ({
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    top: half + dy - diameter / 2,
    [side === "left" ? "left" : "right"]: half + dx - diameter / 2,
  });
  return (
    <PressHighlight
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Choose an emoji"
      highlightStyle={styles.pickerHighlight}
      style={[styles.pickerBubble, { top, left, backgroundColor: fill }]}
    >
      <View pointerEvents="none" style={[styles.trail, styles.pickerTrail, { backgroundColor: fill }, place(geometry.medium, geometry.mediumOffset)]} />
      <View pointerEvents="none" style={[styles.trail, styles.pickerTrail, { backgroundColor: fill }, place(geometry.small, geometry.smallOffset)]} />
      <SmileyIcon size={geometry.glyph} color={iconColor} />
    </PressHighlight>
  );
}

const ThemedEmojiPickerBubble = withUnistyles(EmojiPickerBubble);

const pickerTheme = (theme: Theme) => ({
  fill: theme.colorScheme === "light" ? "#EDEDEF" : "#1F1E21",
  iconColor: theme.colorScheme === "light" ? "#AEAEB2" : "#8E8E93",
});

const ringTheme = (theme: Theme) => ({
  color: theme.colorScheme === "light" ? tapbackColors.selectedRing : tapbackColors.selectedRingDark,
});

const ringStyle = {
  width: tapbackBarMetrics.selectedRing,
  height: tapbackBarMetrics.selectedRing,
} as const;

export interface TapbackBarProps {
  selection?: TapbackSelection;
  recent?: string[];
  onSelect: (selection: TapbackSelection) => void;
  onPickEmoji?: () => void;
  /** Pill width; the overlay stretches it from the screen margin to the bubble's edge. */
  width: number;
  /** x of the emoji bubble's centre relative to the pill's left edge; omit to hide it. */
  pickerX?: number;
  pickerSide?: "left" | "right";
  onPressSound?: boolean;
}

function GlyphOption({
  item,
  selected,
  index,
  onSelect,
  color,
}: {
  item: Item;
  selected: boolean;
  index: number;
  onSelect: (selection: TapbackSelection) => void;
  color: string;
}) {
  const a11yState = useMemo(() => ({ checked: selected }), [selected]);
  const handlePress = useCallback(() => {
    if (selected) return;
    touchSenses();
    onSelect(item.type ? { type: item.type } : { emoji: item.emoji ?? "" });
  }, [item, onSelect, selected]);

  return (
    <PressHighlight
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={a11yState}
      accessibilityLabel={item.label}
      style={styles.option}
      testID={`tapback-option-${index}`}
    >
      {selected ? (
        <View pointerEvents="none" style={[styles.selectedRing, ringStyle, { backgroundColor: color }]} />
      ) : null}
      <TapbackGlyph
        type={item.type}
        emoji={item.emoji}
        size={item.type ? tapbackBarMetrics.glyph : tapbackBarMetrics.emojiSize}
        onAccent={selected}
      />
    </PressHighlight>
  );
}

export const TapbackBar = memo(function TapbackBar({
  selection,
  recent = DEFAULT_RECENT,
  onSelect,
  onPickEmoji,
  width,
  pickerX,
  pickerSide = "left",
}: TapbackBarProps) {
  const items = useMemo<Item[]>(
    () => [
      ...tapbackTypes.map((type) => ({ type, label: tapbackLabels[type], key: type })),
      ...recent.map((emoji) => ({ emoji, label: emoji, key: emoji })),
    ],
    [recent],
  );

  const lead = tapbackBarMetrics.firstCenter - tapbackBarMetrics.slot / 2;
  const rootStyle = useMemo(
    () => [styles.root, { width, height: tapbackBarMetrics.height }],
    [width],
  );
  const contentStyle = useMemo(
    () => [styles.scrollContent, { paddingLeft: lead, paddingRight: lead }],
    [lead],
  );

  return (
    <View style={rootStyle}>
      {pickerX !== undefined ? (
        <ThemedEmojiPickerBubble
          side={pickerSide}
          onPress={onPickEmoji}
          uniProps={pickerTheme}
          top={tapbackBarMetrics.height + tapbackBarMetrics.pickerDrop - pickerBalloonGeometry.main / 2}
          left={pickerX - pickerBalloonGeometry.main / 2}
        />
      ) : null}
      <GlassSurface radius={tapbackBarMetrics.height / 2} style={StyleSheet.absoluteFill} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentStyle}
        style={styles.scroll}
      >
        {items.map((item, index) => (
          <ThemedGlyphOption
            key={item.key}
            item={item}
            index={index}
            selected={isSelected(selection, item)}
            onSelect={onSelect}
            uniProps={ringTheme}
          />
        ))}
        <Text style={styles.hidden} accessibilityElementsHidden>
          {" "}
        </Text>
      </ScrollView>
    </View>
  );
});

const ThemedGlyphOption = withUnistyles(GlyphOption);

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    height: tapbackBarMetrics.height,
  },
  option: {
    width: tapbackBarMetrics.slot,
    height: tapbackBarMetrics.height,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRing: {
    position: "absolute",
    borderRadius: tapbackBarMetrics.selectedRing / 2,
  },
  pickerHighlight: {
    borderRadius: pickerBalloonGeometry.main / 2,
  },
  pickerBubble: {
    position: "absolute",
    width: pickerBalloonGeometry.main,
    height: pickerBalloonGeometry.main,
    borderRadius: pickerBalloonGeometry.main / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  trail: {
    position: "absolute",
  },
  pickerTrail: {
    zIndex: -1,
  },
  hidden: {
    width: 0,
    opacity: 0,
  },
});
