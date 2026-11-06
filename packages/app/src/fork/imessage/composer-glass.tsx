/**
 * Fork (imessage): the composer's frosted field.
 *
 * Messages' input bar is a translucent material the conversation blurs through,
 * not a grey box. On iOS that material is a real `UIVisualEffectView`, which
 * `expo-blur` gives us directly; Android gets a tinted approximation because a
 * live blur there is expensive and version-gated; web gets `backdrop-filter`,
 * which is exactly this effect where the browser supports it.
 *
 * The tint is layered over the blur on purpose: a blur alone leaves text contrast
 * at the mercy of whatever scrolled behind it, and a composer you cannot read is
 * worse than one that is not frosted.
 */
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { isLightSurface } from "./palette";

/** Messages' field corner: a plain circular radius 20, not a continuous corner. */
export const COMPOSER_RADIUS = 20;

/** Measured tints: 0.9 white over the blur in light, 0.9 near-black in dark. */
function isLightTheme(theme: Theme): boolean {
  return isLightSurface(theme.colors.background);
}

interface TintProps extends ViewProps {
  /** Injected by Unistyles from the active theme. */
  color: string;
}

/** A tint layer whose colour is a plain prop, so Unistyles can map it from the theme. */
function Tint({ color, style, ...rest }: TintProps) {
  return <View {...rest} style={[style, { backgroundColor: color }]} />;
}

function Rim({ color, style, ...rest }: TintProps) {
  return (
    <View
      {...rest}
      style={[
        style,
        { borderWidth: 1, borderRadius: COMPOSER_RADIUS, borderColor: color },
      ]}
    />
  );
}

const ThemedTint = withUnistyles(Tint);
const ThemedRim = withUnistyles(Rim);
const ThemedBlur = withUnistyles(BlurView);

const tintProps = (theme: Theme) => ({
  color: isLightTheme(theme) ? "rgba(255,255,255,0.82)" : "rgba(28,28,28,0.82)",
});

const blurProps = (theme: Theme) => ({
  tint: isLightTheme(theme) ? ("light" as const) : ("dark" as const),
  intensity: isLightTheme(theme) ? 60 : 80,
});

const rimProps = (theme: Theme) => ({
  color: isLightTheme(theme) ? "transparent" : "rgba(255,255,255,0.09)",
});

export interface ComposerGlassProps {
  radius?: number;
}

export function ComposerGlass({ radius = COMPOSER_RADIUS }: ComposerGlassProps) {
  if (Platform.OS === "web") {
    // The tint is themed; `backdrop-filter` is a static web-only declaration.
    return (
      <ThemedTint
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            // @ts-expect-error - react-native-web accepts backdropFilter; RN types do not.
            backdropFilter: "blur(24px) saturate(180%)",
          },
        ]}
        uniProps={tintProps}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
    >
      <ThemedBlur
        style={StyleSheet.absoluteFill}
        uniProps={blurProps}
        {...(Platform.OS === "android"
          ? { experimentalBlurMethod: "dimezisBlurView" as const }
          : null)}
      />
      <ThemedTint style={StyleSheet.absoluteFill} uniProps={tintProps} />
      <ThemedRim style={StyleSheet.absoluteFill} uniProps={rimProps} />
    </View>
  );
}
