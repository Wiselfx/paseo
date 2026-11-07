/**
 * Fork (imessage): the link card Messages shows for a bare URL.
 *
 * Ported from `ref/message-ui/registry/imessage/link-preview.tsx` L54-56 + L92-95.
 * iOS row (L56): 198x85, radius 19, host 14/17 at padStart 14, disc 34 with
 * 23 end-inset, contentShift 1.4; macOS measured (L55) is NOT used here because
 * this lives in a phone transcript. Fill/host/disc come from the reference's
 * iOS themeVars (L94): incoming grey + secondary label. The compact host uses
 * secondary label (#8a8a8e / #8d8d93), not the macOS host greys — that pair
 * belongs to the mac capture (L21). Reference L29-33: no iOS card capture
 * exists; the iOS numbers are its re-proportioned guess, kept verbatim.
 *
 * No rich card (title/description/media/richWidth 280.5, title 17/20,
 * richPad 13.85/10) is ported: linkHost/isBareLink only carry a bare URL's
 * hostname, so there is no title/description data to render. No fake host data.
 */
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { bubblePalette } from "./palette";

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
      <CompassDisc size={linkPreviewMetrics.disc} color={discColor} />
    </View>
  );
}

const ThemedCard = withUnistyles(LinkPreviewCard);

const cardTheme = (theme: Theme) => {
  const palette = bubblePalette("agent", theme.colorScheme);
  return {
    background: palette.background,
    hostColor: theme.colorScheme === "light" ? "#8A8A8E" : "#8D8D93",
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

export const linkPreviewMetrics = {
  // Reference link-preview.tsx L54-56: ios {width 198, height 85, radius 19, hostSize 14,
  // hostLineHeight 17, padStart 14, disc 34, discInsetEnd 23, contentShift 1.4,
  // richWidth 280.5, titleSize 17, titleLineHeight 20, richPadX 13.85, richPadY 10}.
  // Measured macOS is L55; the iOS row is the reference's own re-proportioned guess
  // (L29-33 no iOS capture), so the compact card takes the iOS row's measured
  // bubble-family insets, not the mac 140x60 box.
  width: 198,
  height: 85,
  radius: 19,
  hostSize: 14,
  hostLineHeight: 17,
  padStart: 14,
  disc: 34,
  discInsetEnd: 23,
  contentShift: 1.4,
} as const;

const styles = StyleSheet.create({
  card: {
    width: linkPreviewMetrics.width,
    height: linkPreviewMetrics.height,
    borderRadius: linkPreviewMetrics.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: linkPreviewMetrics.padStart,
    paddingRight: linkPreviewMetrics.discInsetEnd,
  },
  host: {
    fontSize: linkPreviewMetrics.hostSize,
    lineHeight: linkPreviewMetrics.hostLineHeight,
    letterSpacing: 0,
    flexShrink: 1,
  },
});
