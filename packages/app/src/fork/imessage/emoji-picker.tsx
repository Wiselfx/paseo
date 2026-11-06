/**
 * Fork (imessage): the emoji picker a tapback's thought bubble opens.
 *
 * The reference kit only measures the *affordance* — the Ø44 thought bubble hanging 14.67 below
 * the Tapback pill — and never a picker panel, because no capture holds one open. So this is the
 * smallest honest thing the bubble can open: the same dim as the long-press overlay, a glass
 * sheet with the measured corner radius, and a plain grid of emoji.
 *
 * It deliberately does not pretend to be Apple's full picker (categories, search, skin tones,
 * Memoji): none of that is in the reference, and a fake category rail would be worse than a grid.
 * The grid is the tapback *set* plus the recent row the bar already shows.
 */
import { memo, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Portal } from "@gorhom/portal";

import { PressHighlight } from "@/components/ui/press-highlight";
import { GlassSurface } from "./glass";
import { touchSenses } from "./senses";

const COLUMNS = 8;

/** The six classics plus a useful spread; no claim that this is Apple's catalogue. */
const EMOJI = [
  "❤️", "👍", "👎", "😂", "‼️", "❓",
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😊",
  "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
  "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪",
  "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒", "😞",
  "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫",
  "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥",
  "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐",
  "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲",
  "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢",
  "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈",
  "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️",
  "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻",
  "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊",
  "💋", "💌", "💘", "💝", "💖", "💗", "💓", "💞",
] as const;

const CELL = {
  width: 43,
  height: 43,
  borderRadius: 10,
} as const;

export const emojiPickerMetrics = {
  radius: 24,
  cell: CELL,
  columns: COLUMNS,
  padding: 12,
} as const;

interface CellProps {
  emoji: string;
  onSelect: (emoji: string) => void;
}

const EmojiCell = memo(function EmojiCell({ emoji, onSelect }: CellProps) {
  const handlePress = useCallback(() => {
    touchSenses();
    onSelect(emoji);
  }, [emoji, onSelect]);
  return (
    <PressHighlight
      onPress={handlePress}
      highlightStyle={styles.cellHighlight}
      accessibilityRole="button"
      accessibilityLabel={`React with ${emoji}`}
      style={styles.cell}
    >
      <Text style={styles.glyph}>{emoji}</Text>
    </PressHighlight>
  );
});

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker = memo(function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <Portal>
      <View style={styles.root}>
        <PressHighlight
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          highlightStyle={styles.noHighlight}
          accessibilityRole="button"
          accessibilityLabel="Dismiss emoji picker"
        />
        <View style={styles.sheet}>
          <GlassSurface radius={emojiPickerMetrics.radius} cast="sheet" style={StyleSheet.absoluteFill} />
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {EMOJI.map((emoji) => (
              <EmojiCell key={emoji} emoji={emoji} onSelect={onSelect} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Portal>
  );
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "46%",
    borderTopLeftRadius: emojiPickerMetrics.radius,
    borderTopRightRadius: emojiPickerMetrics.radius,
    overflow: "hidden",
    paddingTop: emojiPickerMetrics.padding,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  cell: {
    ...emojiPickerMetrics.cell,
    alignItems: "center",
    justifyContent: "center",
  },
  cellHighlight: {
    backgroundColor: "rgba(120,120,128,0.2)",
    borderRadius: emojiPickerMetrics.cell.borderRadius,
  },
  glyph: {
    fontSize: 28,
    lineHeight: 34,
  },
  noHighlight: {
    backgroundColor: "transparent",
  },
});
