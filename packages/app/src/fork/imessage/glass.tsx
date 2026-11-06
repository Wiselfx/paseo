/**
 * Fork (imessage): the frosted surface every Messages control is made of.
 *
 * iOS 26's Liquid Glass is a backdrop blur with a translucent fill on top, a specular rim, and
 * a soft drop shadow underneath. `expo-blur` is the real `UIVisualEffectView`, so on iOS this
 * is the actual material rather than a stack of semi-transparent views.
 *
 * The shadow is load-bearing, and its absence is why a glass control reads as a flat grey
 * rectangle. Every one is measured:
 *
 * - nav capsule `0 6 36 spread 4` at 6.5%, nav circle `0 5 20 spread 6` at 5.5%;
 * - pill / menu glass `0 6 24` at 10% in light, 50% in dark (dark casts almost nothing, it
 *   carries the rim instead);
 * - the long-press menu is its own shadow, fitted to the capture as alpha 0.098, sigma 17.5,
 *   offset 7 down;
 * - the `+` sheet darkens the page by 11/255 beside it and 9 above, back to white 30pt out, so
 *   about 6.6%.
 *
 * Dark gets the measured specular rim rather than a shadow: three inset rings of white at
 * 3.85% / 3.2% / 6.1% across three device rows, which is what the back button's integer box
 * measures over black. Light gets a single 0.5pt 55% white inner hairline.
 */
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

/** A clipped box that can cast a shadow and carry an inner rim in the same declaration. */
function Cast({
  shadow,
  style,
  ...rest
}: ColourProps & { shadow?: string }) {
  return <View {...rest} style={[style, shadow ? { boxShadow: shadow } : null]} />;
}

const ThemedTint = withUnistyles(Tint);
const ThemedCast = withUnistyles(Cast);
const ThemedBlur = withUnistyles(BlurView);

const tintProps = (theme: Theme) => ({
  color: theme.colorScheme === "light" ? "rgba(255,255,255,0.9)" : "rgba(28,28,28,0.9)",
});

const blurProps = (theme: Theme) => ({
  tint: theme.colorScheme === "light" ? ("light" as const) : ("dark" as const),
  intensity: theme.colorScheme === "light" ? 60 : 80,
});

const DARK_RIM =
  "inset 0 0 0 0.3333px rgba(255,255,255,0.0385), inset 0 0 0 0.6667px rgba(255,255,255,0.032), inset 0 0 0 1px rgba(255,255,255,0.061)";

/** Which measured shadow this surface casts. Everything here comes from a capture. */
export type GlassCast = "none" | "pill" | "menu" | "sheet" | "nav-pill" | "nav-round";

function shadowFor(cast: GlassCast, appearance: "light" | "dark"): string | undefined {
  if (cast === "none") return undefined;
  const light = appearance === "light";
  if (cast === "nav-pill") {
    return light ? "0 6px 36px 4px rgba(0,0,0,0.065)" : DARK_RIM;
  }
  if (cast === "nav-round") {
    return light ? "0 5px 20px 6px rgba(0,0,0,0.055)" : DARK_RIM;
  }
  if (cast === "sheet") {
    return light ? "0 8px 40px 6px rgba(0,0,0,0.066)" : DARK_RIM;
  }
  if (cast === "menu") {
    return light
      ? "0 7px 35px rgba(0,0,0,0.098), inset 0 0 0 0.5px rgba(255,255,255,0.55)"
      : "0 6px 24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.15)";
  }
  // pill
  return light
    ? "0 6px 24px rgba(0,0,0,0.10), inset 0 0 0 0.5px rgba(255,255,255,0.55)"
    : `0 6px 24px rgba(0,0,0,0.5), ${DARK_RIM}`;
}

const castProps = (cast: GlassCast) => (theme: Theme) => ({
  shadow: shadowFor(cast, theme.colorScheme),
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

const webCastProps = (cast: GlassCast) => (theme: Theme) => ({
  color: "transparent",
  shadow: shadowFor(cast, theme.colorScheme),
});

export interface GlassSurfaceProps extends ViewProps {
  /** Corner radius in points; pass half the height for a capsule. */
  radius: number;
  /** Overrides the measured 90% fill — e.g. the composer wants a touch more body. */
  tint?: string | ((theme: Theme) => string);
  /** Which measured shadow this surface casts. Defaults to none: flat glass is a bug, not a default. */
  cast?: GlassCast;
  style?: StyleProp<ViewStyle>;
}

export function GlassSurface({
  radius,
  tint,
  cast = "pill",
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const overlay = resolveTint(tint);

  if (Platform.OS === "web") {
    return (
      <ThemedCast
        {...rest}
        style={[
          style,
          {
            borderRadius: radius,
            // @ts-expect-error - react-native-web accepts backdropFilter; RN types do not.
            backdropFilter: "blur(24px) saturate(180%)",
          },
        ]}
        uniProps={webCastProps(cast)}
      >
        <ThemedTint style={StyleSheet.absoluteFill} uniProps={overlay} />
        {children}
      </ThemedCast>
    );
  }

  return (
    <ThemedCast
      {...rest}
      style={[styles.clip, { borderRadius: radius }, style]}
      uniProps={castProps(cast)}
    >
      <ThemedBlur
        style={StyleSheet.absoluteFill}
        uniProps={blurProps}
        {...(Platform.OS === "android"
          ? { experimentalBlurMethod: "dimezisBlurView" as const }
          : null)}
      />
      <ThemedTint style={StyleSheet.absoluteFill} uniProps={overlay} />
      {children}
    </ThemedCast>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
});
