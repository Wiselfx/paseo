/**
 * Fork (imessage): contact avatar — initials over the native gray-blue gradient.
 *
 * Measured in `avatar.tsx` in the reference kit and re-fitted independently on the Ø60
 * nav-bar circle, which returns the same endpoints:
 *
 * - fill: a vertical gradient, light #a9c2e1 → #747fb9, dark #575368 → #302649. It does not
 *   change with the circle's size.
 * - initials: white, weight 600, at 7/15 of the diameter — 21 at Ø45, 28 at Ø60, 37.33 at
 *   Ø80, three diameters that pin the ratio.
 * - a photo is a plain circular clip: no rim, no shadow.
 *
 * The generic silhouette is drawn from the SF Symbol rather than measured; no capture in the
 * kit holds a contact without initials or a photo, and the component says so too.
 */
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

/** Initials type size for a circle of `size`: the measured 7/15 of the diameter. */
export function avatarFontSize(size: number): number {
  return (size * 7) / 15;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export interface AvatarProps {
  size?: number;
  /** One or two letters. Ignored when `name` produces initials of its own. */
  initials?: string;
  name?: string;
  /** A photo; not wired yet, but the shape is here. */
  uri?: string;
  /** Injected: the two gradient endpoints for the active appearance. */
  colors?: readonly [string, string];
}

const GRADIENT_START = { x: 0.5, y: 0 } as const;
const GRADIENT_END = { x: 0.5, y: 1 } as const;

function AvatarBase({ size = 40, initials, name, uri, colors }: AvatarProps) {
  const letters = initials ?? (name ? initialsOf(name) : "");
  const gradient = colors ?? ["#A9C2E1", "#747FB9"];
  const rootStyle = useMemo(
    () => [styles.root, { width: size, height: size, borderRadius: size / 2 }],
    [size],
  );
  const letterStyle = useMemo(
    () => [styles.initials, { fontSize: avatarFontSize(size) }],
    [size],
  );

  return (
    <View style={rootStyle} accessibilityRole="image" accessibilityLabel={name ?? letters}>
      <LinearGradient
        colors={gradient as [string, string]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      {renderFace(uri, letters, size, letterStyle)}
    </View>
  );
}

const ThemedAvatar = withUnistyles(AvatarBase);

const avatarTheme = (theme: Theme) => ({ colors: avatarColors(theme) });

function avatarColors(theme: Theme): readonly [string, string] {
  return theme.colorScheme === "light" ? ["#A9C2E1", "#747FB9"] : ["#575368", "#302649"];
}

function renderFace(
  uri: string | undefined,
  letters: string,
  size: number,
  letterStyle: object,
) {
  if (letters) {
    return (
      <Text style={letterStyle} numberOfLines={1}>
        {letters}
      </Text>
    );
  }
  if (uri) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="#FFFFFF">
      <Circle cx="20" cy="15.5" r="7.5" />
      <Path d="M6 40c0-9 5.8-14.5 14-14.5S34 31 34 40Z" />
    </Svg>
  );
}

export const Avatar = memo(function Avatar(props: AvatarProps) {
  return <ThemedAvatar {...props} uniProps={avatarTheme} />;
});

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0,
    // `translateY(0.02em)`: puts the ink top on native at Ø45 and Ø80, one device px low at Ø60.
    transform: [{ translateY: 1 }],
  },
});
