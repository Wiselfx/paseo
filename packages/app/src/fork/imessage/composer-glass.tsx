/**
 * Fork (imessage): the composer's frosted field.
 *
 * Messages' input bar is a translucent material the conversation blurs through,
 * not a grey box. The stainless details live in `glass.tsx`; this is the field's
 * placement and its slightly denser fill, because a field you type into wants a
 * touch more body than a button you tap.
 *
 * Elevation lives on the composer wrapper (`inputWrapper`), not here: the field
 * itself is clipped by the text surface, and this file only carries the material.
 */
import { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { withUnistyles } from "react-native-unistyles";

import type { Theme } from "@/styles/theme";

import { GlassSurface } from "./glass";

/** Messages' field corner: a plain circular radius 20, not a continuous corner. */
export const COMPOSER_RADIUS = 20;

const DARK_RIM =
  "inset 0 0 0 0.3333px rgba(255,255,255,0.0385), inset 0 0 0 0.6667px rgba(255,255,255,0.032), inset 0 0 0 1px rgba(255,255,255,0.061)";

const fieldTint = (theme: Theme) =>
  theme.colorScheme === "light" ? "rgba(255,255,255,0.74)" : "rgba(28,28,28,0.74)";

interface RimProps {
  shadow: string;
  style?: StyleProp<ViewStyle>;
}

function Rim({ shadow, style }: RimProps) {
  return <View pointerEvents="none" style={[style, { boxShadow: shadow }]} />;
}

const ThemedRim = withUnistyles(Rim);

const rimProps = (theme: Theme) => ({
  shadow:
    theme.colorScheme === "light"
      ? "inset 0 0 0 0.5px rgba(255,255,255,0.55)"
      : DARK_RIM,
});

interface SheenProps {
  colors: readonly [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
}

function Sheen({ colors, start, end, style }: SheenProps) {
  return (
    <LinearGradient pointerEvents="none" colors={colors} start={start} end={end} style={style} />
  );
}

const ThemedSheen = withUnistyles(Sheen);

const sheenProps = (theme: Theme) => ({
  colors: [
    theme.colorScheme === "light" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
    "transparent",
  ] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
});

export interface ComposerGlassProps {
  radius?: number;
}

export function ComposerGlass({ radius = COMPOSER_RADIUS }: ComposerGlassProps) {
  const sheenStyle = useMemo(
    () => [
      styles.sheen,
      { borderTopLeftRadius: radius, borderTopRightRadius: radius },
    ],
    [radius],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <GlassSurface
        pointerEvents="none"
        radius={radius}
        tint={fieldTint}
        cast="none"
        style={StyleSheet.absoluteFill}
      />
      <ThemedRim style={[StyleSheet.absoluteFill, { borderRadius: radius }]} uniProps={rimProps} />
      <ThemedSheen style={sheenStyle} uniProps={sheenProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
});
