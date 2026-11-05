/**
 * Fork (imessage): the chat bubble itself.
 *
 * Two identities, one geometry — the same rule iMessage uses. Blue and
 * right-aligned means "you"; grey and left-aligned means "them". The colours are
 * literals on purpose: they are the reference, not the app's palette, so a theme
 * change must not quietly move them.
 *
 * The tail is a corner radius, not a drawn shape: the corner nearest the speaker
 * is tighter than the rest. Cheap, and it survives any bubble height.
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/** Apple's system blue takes one value per appearance; the grey follows it. */
const BLUE = { light: "#007AFF", dark: "#0A84FF" } as const;
const GREY = { light: "#E9E9EB", dark: "#26252A" } as const;

/** iMessage's own metrics: 17pt SF, ~22pt line, 18pt radius with a 6pt tail. */
export const BUBBLE_RADIUS = 18;
const TAIL_RADIUS = 6;

export type BubbleSide = "user" | "agent";

export interface BubbleProps {
  side: BubbleSide;
  /** Whether this bubble ends its group — only then does the tail face the speaker. */
  tail?: boolean;
  children: ReactNode;
}

export function Bubble({ side, tail = true, children }: BubbleProps) {
  return (
    <View
      style={[
        styles.row,
        side === "user" ? styles.rowUser : styles.rowAgent,
      ]}
    >
      <View
        style={[
          styles.bubble,
          side === "user" ? styles.bubbleUser : styles.bubbleAgent,
          tail ? (side === "user" ? styles.tailUser : styles.tailAgent) : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const isDark = theme.colorScheme === "dark";
  return {
    row: {
      flexDirection: "row",
      width: "100%",
    },
    rowUser: { justifyContent: "flex-end" },
    rowAgent: { justifyContent: "flex-start" },
    bubble: {
      maxWidth: "78%",
      borderRadius: BUBBLE_RADIUS,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexShrink: 1,
    },
    bubbleUser: {
      backgroundColor: isDark ? BLUE.dark : BLUE.light,
    },
    bubbleAgent: {
      backgroundColor: isDark ? GREY.dark : GREY.light,
    },
    tailUser: { borderBottomRightRadius: TAIL_RADIUS },
    tailAgent: { borderBottomLeftRadius: TAIL_RADIUS },
  };
});
