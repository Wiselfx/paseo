/**
 * Fork (imessage): the link card Messages shows for a bare URL.
 *
 * Measured from `link-preview.tsx`:
 *
 * - macOS: a 140 × 60 card, radius 14, filled with the incoming grey (#e9e9eb light / #3b3b3d
 *   dark); the hostname is 10pt, its ink 10 in from the card's edge and its baseline 35 below
 *   the card's top; the Safari compass disc is 24 with its right edge 16 from the card's right
 *   edge; both the baseline and the disc centre sit 1 below the card's vertical centre.
 * - iOS has no capture of its card, so it reuses what iOS itself measures: the bubble's radius,
 *   the incoming grey, the secondary label and the 13.85/10 padding. That is what this draws —
 *   a bubble-shaped card rather than a 140-wide mac one, because it lives in a phone transcript.
 *
 * The corner is really one of Apple's continuous corners (superellipse 17.375 / 2.5), which
 * React Native cannot draw; the card takes the best circular radius, as the reference does.
 */
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { bubblePalette } from "./palette";
import { BUBBLE_RADIUS } from "./shape";

/** Safari's compass in the card's trailing corner, drawn rather than shipped as artwork. */
function CompassDisc({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill={color} />
      <Path d="M16.4 7.6 13.6 13.6 7.6 16.4 10.4 10.4Z" fill="#FFFFFF" />
      <Path d="M16.4 7.6 13.6 13.6 10.4 10.4Z" fill="#FF3B30" />
    </Svg>
  );
}

interface CardProps {
  host: string;
  background: string;
  hostColor: string;
  discColor: string;
}

function LinkPreviewCard({ host, background, hostColor, discColor }: CardProps) {
  const rootStyle = useMemo(() => [styles.card, { backgroundColor: background }], [background]);
  const hostStyle = useMemo(() => [styles.host, { color: hostColor }], [hostColor]);
  return (
    <View style={rootStyle}>
      <Text style={hostStyle} numberOfLines={1}>
        {host}
      </Text>
      <CompassDisc size={24} color={discColor} />
    </View>
  );
}

const ThemedCard = withUnistyles(LinkPreviewCard);

const cardTheme = (theme: Theme) => {
  const palette = bubblePalette("agent", theme.colorScheme);
  return {
    background: palette.background,
    hostColor: theme.colorScheme === "light" ? "#808084" : "#A6A6A9",
    discColor: theme.colorScheme === "light" ? "#757576" : "#A7A7A7",
  };
};

/** The hostname a bare URL should show: no `www.`, no path. */
export function linkHost(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "");
  const host = stripped.split(/[/?#]/)[0] ?? stripped;
  return host.replace(/^www\./, "");
}

/** True when a whole block is nothing but one URL — the case Messages renders as a card. */
export function isBareLink(block: string): boolean {
  return /^https?:\/\/\S+$/.test(block.trim());
}

export interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = memo(function LinkPreview({ url }: LinkPreviewProps) {
  return <ThemedCard host={linkHost(url)} uniProps={cardTheme} />;
});

const styles = StyleSheet.create({
  card: {
    width: 280.5,
    height: 60,
    borderRadius: BUBBLE_RADIUS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 13.85,
    paddingRight: 13.85,
  },
  host: {
    fontSize: 15,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
});
