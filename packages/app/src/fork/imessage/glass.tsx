/**
 * Fork (imessage): the frosted surface every Messages control is made of.
 *
 * iOS 26's Liquid Glass is a backdrop blur with a translucent fill on top and, in
 * dark, a 1pt specular rim that ramps inward. `expo-blur` is the real
 * `UIVisualEffectView`, so on iOS this is the actual material rather than a
 * stack of semi-transparent views.
 *
 * The fill is layered *over* the blur on purpose: a blur alone leaves text
 * contrast at the mercy of whatever scrolled behind it.
 *
 * Measured fills (from `ios-nav-bar.tsx` in the reference kit): 90% white light,
 * 90% #1c1c1c dark, with the same fill used by the composer's field. Web gets
 * `backdrop-filter`, which is the same effect where the browser supports it;
 * Android gets the tint over a cheap blur because a live blur there is version
 * gated and expensive.
 */
import { useMemo } from "react";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

interface ColourProps extends ViewProps {
  /** Injected by Unistyles from the active theme. */
  color: string;
}

function Tint({ color, style, ...rest }: ColourProps) {
  return <View {...rest} style={[style, { backgroundColor: color }]} />;
}

function Rim({ color, radius, style, ...rest }: ColourProps & { radius: number }) {
  return (
    <View
      {...rest}
      style={[style, { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius, borderColor: color }]}
    />
  );
}

const ThemedTint = withUnistyles(Tint);
const ThemedRim = withUnistyles(Rim);
const ThemedBlur = withUnistyles(BlurView);

const tintProps = (theme: Theme) => ({
  color: theme.colorScheme === "light" ? "rgba(255,255,255,0.9)" : "rgba(28,28,28,0.9)",
});

const blurProps = (theme: Theme) => ({
  tint: theme.colorScheme === "light" ? ("light" as const) : ("dark" as const),
  intensity: theme.colorScheme === "light" ? 60 : 80,
});

const rimProps = (theme: Theme) => ({
  color:
    theme.colorScheme === "light" ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.085)",
});

/** A fixed tint still has to come back as a stable theme callback. */
function resolveTint(tint: GlassSurfaceProps["tint"]) {
  if (tint === undefined) return tintProps;
  if (typeof tint === "function") {
    return (theme: Theme) => ({ color: tint(theme) });
  }
  const fixed = tint;
  return () => ({ color: fixed });
}

export interface GlassSurfaceProps extends ViewProps {
  /** Corner radius in points; pass half the height for a capsule. */
  radius: number;
  /** Overrides the measured 90% fill — e.g. the composer wants a touch more body. */
  tint?: string | ((theme: Theme) => string);
  style?: StyleProp<ViewStyle>;
}

export function GlassSurface({ radius, tint, style, children, ...rest }: GlassSurfaceProps) {
  const overlay = useMemo(() => resolveTint(tint), [tint]);

  if (Platform.OS === "web") {
    return (
      <ThemedTint
        {...rest}
        style={[
          style,
          {
            borderRadius: radius,
            // @ts-expect-error - react-native-web accepts backdropFilter; RN types do not.
            backdropFilter: "blur(24px) saturate(180%)",
          },
        ]}
        uniProps={overlay}
      />
    );
  }

  return (
    <View
      {...rest}
      style={[styles.clip, { borderRadius: radius }, style]}
    >
      <ThemedBlur
        style={StyleSheet.absoluteFill}
        uniProps={blurProps}
        {...(Platform.OS === "android"
          ? { experimentalBlurMethod: "dimezisBlurView" as const }
          : null)}
      />
      <ThemedTint style={StyleSheet.absoluteFill} uniProps={overlay} />
      <ThemedRim radius={radius} style={StyleSheet.absoluteFill} uniProps={rimProps} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
});
