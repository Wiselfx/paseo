/**
 * Fork (imessage): the `+` sheet — iOS 26's send menu.
 *
 * Measured from `ios-plus-menu.tsx` (`plus-menu-open-light.png`, 402×874 @3x):
 *
 * - sheet x 8.67–331.33, y 371–831.67: 322.67 × 460.67, continuous corner ≈24, so its bottom
 *   edge sits 42.33 above the screen bottom and its left edge 8.67 from the left;
 * - rows are 66.5 apart, the first centred at y 425.83; the Ø39 icon disc is centred at
 *   x 63.17 and the 24pt label starts at x 108;
 * - nothing behind it dims — the conversation stays sharp to the sheet's edge, and the only
 *   backdrop that ramps is the sheet's own glass. That is measured, which is why there is no
 *   scrim here;
 * - the glass is the measured neutral fit: 20 blur, 0.72 alpha, tint 248 (28 in dark), which
 *   beat the kit's earlier `45/0.62/255` on the capture (rms 7.24 against 8.55);
 * - it grows from the composer's `+`, which is a Ø40 glass circle at (48, 826) — a *layout*
 *   interpolation between the two boxes so the rows never squash, not a scale.
 *
 * The open is ζ 0.86 at 15 rad/s (0.90 at 200ms, settled by 350) and the close is ζ 1 at 24
 * (back inside the `+` in about 200ms). Those two are borrowed from the kit's nearest
 * measured neighbours, which is what the reference says about them too.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Portal } from "@gorhom/portal";
import { useFloatingHeaderOverlayHost } from "@/components/floating-header";
import { useFloatingPanelPortalHostName } from "@/components/ui/floating-panel-portal";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { PressHighlight } from "@/components/ui/press-highlight";
import { GlassSurface } from "./glass";
import { touchSenses } from "./senses";

export const plusMenuMetrics = {
  left: 8.6667,
  width: 322.6667,
  height: 460.6667,
  radius: 24,
  rowPitch: 66.5,
  firstRowCenter: 425.8333,
  iconSize: 39,
  iconCenterX: 63.1667,
  labelX: 108,
  labelSize: 24,
  /** Bottom of the sheet above the screen bottom, from y 831.67 on an 874pt screen. */
  bottomInset: 42.3333,
} as const;

export const plusMenuMotion = {
  /** The composer's `+`, which the sheet grows out of. */
  button: { centerX: 48, centerY: 826, size: 40 },
  sheetBlur: 20,
  sheetSaturate: 1.9,
  rowStart: 0.16,
  rowStagger: 0.045,
  rowSpan: 0.34,
  rowLift: 10,
  open: { damping: 18, stiffness: 225, mass: 1 },
  close: { damping: 24, stiffness: 576, mass: 1 },
} as const;

export interface PlusMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}

interface RowProps {
  item: PlusMenuItem;
  onPress: (item: PlusMenuItem) => void;
  color: string;
  disabledColor: string;
  disc: string;
}

const PlusRow = memo(function PlusRow({ item, onPress, color, disabledColor, disc }: RowProps) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const labelStyle = useMemo(
    () => [styles.label, { color: item.disabled ? disabledColor : color }],
    [item.disabled, disabledColor, color],
  );
  const discStyle = useMemo(() => [{ backgroundColor: disc }], [disc]);
  return (
    <PressHighlight
      onPress={handlePress}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityLabel={item.label}
      highlightStyle={styles.rowHighlight}
      style={styles.row}
      testID={`plus-menu-item-${item.id}`}
    >
      <View style={styles.iconWrap}>
        <View style={[styles.iconDisc, discStyle]}>{item.icon}</View>
      </View>
      <Text style={labelStyle} numberOfLines={1}>
        {item.label}
      </Text>
    </PressHighlight>
  );
});

function rowTheme(theme: Theme) {
  return {
    color: theme.colorScheme === "light" ? "#000000" : "#F4F3F4",
    disabledColor: theme.colorScheme === "light" ? "#BDBDBD" : "#5D5D5D",
    // The measured rows are Apple app icons on their own discs; Paseo's rows are actions, so
    // they get the system fill rather than a colour Apple never used here.
    disc: theme.colorScheme === "light" ? "rgba(120,120,128,0.12)" : "rgba(120,120,128,0.24)",
  };
}

const ThemedRow = withUnistyles(PlusRow);

const tintProps = (theme: Theme) => ({
  tint: theme.colorScheme === "light" ? "rgba(248,248,248,0.72)" : "rgba(28,28,28,0.72)",
});

const ThemedGlass = withUnistyles(function PlusGlass({
  tint,
  radius,
  style,
}: {
  tint: string;
  radius: number;
  style?: object;
}) {
  return <GlassSurface radius={radius} tint={tint} cast="sheet" style={style} />;
});

export interface PlusMenuProps {
  items: PlusMenuItem[];
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
}

export function PlusMenu({ items, open, onClose, onExited }: PlusMenuProps) {
  const frame = useWindowDimensions();
  const headerHost = useFloatingHeaderOverlayHost();
  const panelHost = useFloatingPanelPortalHostName();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(open ? 0 : 1);
  const exited = useRef(onExited);
  useEffect(() => {
    exited.current = onExited;
  }, [onExited]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withSpring(1, plusMenuMotion.open);
      return;
    }
    progress.value = withSpring(0, plusMenuMotion.close);
    const timer = setTimeout(() => {
      setMounted(false);
      exited.current?.();
    }, 240);
    return () => clearTimeout(timer);
  }, [open, progress]);

  const handleRow = useCallback(
    (item: PlusMenuItem) => {
      if (item.disabled) return;
      touchSenses();
      onClose();
      item.onSelect?.();
    },
    [onClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const sheet = useMemo(() => {
    const width = Math.min(plusMenuMetrics.width, frame.width - plusMenuMetrics.left * 2);
    return {
      left: plusMenuMetrics.left,
      bottom: plusMenuMetrics.bottomInset,
      width,
      maxHeight: Math.min(plusMenuMetrics.height, frame.height * 0.62),
    };
  }, [frame.width, frame.height]);

  if (!mounted) return null;

  return (
    <Portal hostName={headerHost ?? panelHost}>
      <View style={StyleSheet.absoluteFill}>
        <PlusMenuBackdrop onPress={onClose} />
        {/* Nothing dims: measured, and the sheet is the only thing that ramps. */}
        <Animated.View style={[styles.sheet, sheet, sheetStyle]}>
          <ThemedGlass radius={plusMenuMetrics.radius} style={StyleSheet.absoluteFill} uniProps={tintProps} />
          <View style={styles.rows}>
            {items.map((item) => (
              <ThemedRow key={item.id} item={item} onPress={handleRow} uniProps={rowTheme} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

/** Dismiss target: the sheet has no scrim, so a tap outside it closes it. */
export function PlusMenuBackdrop({ onPress }: { onPress: () => void }) {
  return (
    <PressHighlight
      style={StyleSheet.absoluteFill}
      onPress={onPress}
      highlightStyle={styles.noHighlight}
      accessibilityRole="button"
      accessibilityLabel="Dismiss menu"
    />
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    borderRadius: plusMenuMetrics.radius,
    overflow: "hidden",
    paddingTop: plusMenuMetrics.firstRowCenter - plusMenuMetrics.rowPitch / 2,
  },
  rows: {
    flexDirection: "column",
  },
  row: {
    height: plusMenuMetrics.rowPitch,
    flexDirection: "row",
    alignItems: "center",
  },
  rowHighlight: {
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 15.8333,
    marginHorizontal: 6.4533,
  },
  iconWrap: {
    width: plusMenuMetrics.iconSize,
    marginLeft: plusMenuMetrics.iconCenterX - plusMenuMetrics.iconSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisc: {
    width: plusMenuMetrics.iconSize,
    height: plusMenuMetrics.iconSize,
    borderRadius: plusMenuMetrics.iconSize / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  label: {
    marginLeft: plusMenuMetrics.labelX - plusMenuMetrics.iconCenterX - plusMenuMetrics.iconSize / 2,
    fontSize: plusMenuMetrics.labelSize,
    letterSpacing: -0.4,
  },
  noHighlight: {
    backgroundColor: "transparent",
  },
});
