/**
 * Fork (imessage): the iOS message context menu that rides under a lifted bubble.
 *
 * Measured from `context-menu.tsx` (whose `contextMenuMetrics.ios` this is):
 *
 * - 250 wide, 10 of padding above and below 42-tall rows, so four rows are 188 tall;
 * - labels are 17pt with their ink starting 60 from the leading edge, icons centred 36.2 in;
 * - radius 32, and it is a squircle: a circle anywhere near that radius is 2+ points off the
 *   traced corner. Continuous corners need `corner-shape`, which React Native does not have,
 *   so the clip is a plain 32pt radius here and that is the one thing in this file that is
 *   approximating rather than reproducing.
 * - the glass is the dimmed list seen through it, tinted by the bubble underneath.
 *
 * A photo gets a different menu (Save / Copy / More…) with no Translate and no Select, and
 * that is data, not chrome: `IOS_MESSAGE_MENU` and `IOS_PHOTO_MENU` both fit this panel.
 */
import { memo, useCallback, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Copy,
  Ellipsis,
  Languages,
  SquarePen,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { PressHighlight } from "@/components/ui/press-highlight";

export type MenuIconName = "copy" | "translate" | "select" | "more" | "edit";

export type ContextMenuItem =
  | { id: string; label: string; icon?: MenuIconName; destructive?: boolean; disabled?: boolean }
  | { separator: true };

export const contextMenuMetrics = {
  width: 250,
  row: 42,
  padding: 10,
  radius: 32,
  fontSize: 17,
  textX: 60,
  iconCenter: 36.2,
  iconBox: 28,
} as const;

export const IOS_MESSAGE_MENU: ContextMenuItem[] = [
  { id: "copy", label: "Copy", icon: "copy" },
  { id: "translate", label: "Translate", icon: "translate" },
  { id: "select", label: "Select", icon: "select" },
  { id: "more", label: "More…", icon: "more" },
];

/**
 * A photo does not get the text bubble's menu — this is measured on a device, and the
 * three-row height (10 + 3×42 + 10 = 146) is confirmed against the capture's own panel.
 */
export const IOS_PHOTO_MENU: ContextMenuItem[] = [
  { id: "save", label: "Save", icon: "copy" },
  { id: "copy", label: "Copy", icon: "copy" },
  { id: "more", label: "More…", icon: "more" },
];

export function iosContextMenuHeight(items: ContextMenuItem[]): number {
  const rows = items.filter((item) => !("separator" in item)).length;
  return contextMenuMetrics.padding * 2 + contextMenuMetrics.row * rows;
}

const ICONS: Record<MenuIconName, LucideIcon> = {
  copy: Copy,
  translate: Languages,
  select: TextCursorInput,
  more: Ellipsis,
  edit: SquarePen,
};

interface RowProps {
  item: Extract<ContextMenuItem, { id: string }>;
  onPress: (id: string) => void;
  color: string;
  destructive: string;
}

const MenuRow = memo(function MenuRow({ item, onPress, color, destructive }: RowProps) {
  const Icon = item.icon ? ICONS[item.icon] : null;
  const tint = item.destructive ? destructive : color;
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  const labelStyle = useMemo(() => [styles.label, { color: tint }], [tint]);
  const a11yState = useMemo(() => ({ disabled: item.disabled }), [item.disabled]);
  return (
    <PressHighlight
      onPress={handlePress}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityLabel={item.label}
      accessibilityState={a11yState}
      highlightStyle={styles.rowHighlight}
      style={styles.row}
    >
      <View style={styles.iconBox}>
        {Icon ? <Icon size={20} strokeWidth={1.9} color={tint} /> : null}
      </View>
      <Text style={labelStyle} numberOfLines={1}>
        {item.label}
      </Text>
    </PressHighlight>
  );
});

function rowTheme(theme: Theme) {
  return {
    color: theme.colorScheme === "light" ? "#000000" : "#FFFFFF",
    destructive: theme.colorScheme === "light" ? "#FF3B30" : "#FF453A",
  };
}

const ThemedRow = withUnistyles(MenuRow);

export function contextMenuPanel(
  items: ContextMenuItem[],
  _wash: string | undefined,
  onPress: (id: string) => void,
): ReactNode {
  return (
    <View style={styles.panel}>
      {items.map((item) =>
        "separator" in item ? (
          <View key="separator" style={styles.separator} />
        ) : (
          <ThemedRow key={item.id} item={item} onPress={onPress} uniProps={rowTheme} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: contextMenuMetrics.padding,
    paddingHorizontal: 0,
  },
  row: {
    height: contextMenuMetrics.row,
    flexDirection: "row",
    alignItems: "center",
  },
  rowHighlight: {
    backgroundColor: "rgba(120,120,128,0.2)",
  },
  iconBox: {
    width: contextMenuMetrics.iconBox,
    marginLeft: contextMenuMetrics.iconCenter - contextMenuMetrics.iconBox / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginLeft: contextMenuMetrics.textX - contextMenuMetrics.iconCenter - contextMenuMetrics.iconBox / 2,
    fontSize: contextMenuMetrics.fontSize,
    letterSpacing: -0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: contextMenuMetrics.textX,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
});
