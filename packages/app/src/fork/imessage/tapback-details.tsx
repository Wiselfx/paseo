/**
 * Fork (imessage): the "tapback details" popover.
 *
 * Re-opening a message that already carries your reaction puts this card at the top of the
 * screen, above the pill, instead of just leaving the balloon selected.
 *
 * Measured on `longpress-ok-selected-light.png` (3×):
 *
 * - a 124 × 121 glass card with continuous corners of radius 30, centred on the screen at
 *   y 66.26;
 * - inside it a Ø49.76 white balloon whose trail points straight *down* — Ø11.13 at +27.34
 *   and Ø5.18 at +38.0 from its centre — with its centre 33.57 below the card's top;
 * - the reactor's Ø30.66 avatar centred 93.6 below that;
 * - the glyph's ink is 26.6 wide.
 *
 * The avatar is Paseo's own, not the reactor's: this app has no per-reactor identity yet, so it
 * shows you on the same measured gradient with a "You" caption. When messages carry reaction
 * authors this becomes two props and nothing else moves.
 */
import { memo, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { Avatar } from "./avatar";
import { GlassSurface } from "./glass";
import { TapbackGlyph } from "./tapback";
import type { TapbackSelection } from "./tapback-bar";

export const tapbackDetailsMetrics = {
  width: 124,
  height: 121,
  radius: 30,
  top: 66.26,
  balloon: {
    main: 49.76,
    medium: 11.13,
    small: 5.18,
    mediumOffset: 27.34,
    smallOffset: 38,
    glyph: 26.6,
    glyphOffsetY: 1.2,
  },
  balloonCenterY: 33.57,
  avatar: 30.66,
  avatarCenterY: 93.6,
} as const;

const m = tapbackDetailsMetrics;
const half = m.balloon.main / 2;

const MEDIUM_TRAIL = {
  width: m.balloon.medium,
  height: m.balloon.medium,
  borderRadius: m.balloon.medium / 2,
  top: half + m.balloon.mediumOffset - m.balloon.medium / 2,
  left: half - m.balloon.medium / 2,
} as const;

const SMALL_TRAIL = {
  width: m.balloon.small,
  height: m.balloon.small,
  borderRadius: m.balloon.small / 2,
  top: half + m.balloon.smallOffset - m.balloon.small / 2,
  left: half - m.balloon.small / 2,
} as const;

const BALLOON_BOX = {
  left: m.width / 2 - m.balloon.main / 2,
  top: m.balloonCenterY - m.balloon.main / 2,
  width: m.balloon.main,
  height: m.balloon.main,
  borderRadius: m.balloon.main / 2,
} as const;

const AVATAR_BOX = {
  left: m.width / 2 - m.avatar / 2,
  top: m.avatarCenterY - m.avatar / 2,
} as const;

const GLYPH_BOX = {
  left: m.width / 2 - m.balloon.glyph / 2,
  top: m.balloonCenterY - m.balloon.glyph / 2 + 2 * m.balloon.glyphOffsetY,
} as const;

interface CardProps {
  balloon: string;
  caption: string;
  glyph: ReactNode;
}

function TapbackDetailsCard({ balloon, caption, glyph }: CardProps) {
  const boxStyle = useMemo(() => [styles.balloon, { backgroundColor: balloon }], [balloon]);
  const mediumStyle = useMemo(
    () => [styles.trail, { backgroundColor: balloon }, MEDIUM_TRAIL],
    [balloon],
  );
  const smallStyle = useMemo(
    () => [styles.trail, { backgroundColor: balloon }, SMALL_TRAIL],
    [balloon],
  );
  const captionStyle = useMemo(() => [styles.caption, { color: caption }], [caption]);
  return (
    <View style={styles.card}>
      <GlassSurface radius={m.radius} cast="menu" style={StyleSheet.absoluteFill} />
      <View style={boxStyle}>
        <View pointerEvents="none" style={mediumStyle} />
        <View pointerEvents="none" style={smallStyle} />
      </View>
      <View style={styles.glyph}>{glyph}</View>
      <View style={AVATAR_BOX}>
        <Avatar size={m.avatar} initials="Y" name="You" />
      </View>
      <Text style={captionStyle} numberOfLines={1}>
        You
      </Text>
    </View>
  );
}

const ThemedCard = withUnistyles(TapbackDetailsCard);

const cardTheme = (theme: Theme) => ({
  // The details balloon stays white in both appearances — it is the card's own surface, not the
  // incoming grey.
  balloon: "#FFFFFF",
  caption: theme.colorScheme === "light" ? "#8A8A8E" : "#8D8D93",
});

export interface TapbackDetailsProps {
  selection: TapbackSelection;
}

export const TapbackDetails = memo(function TapbackDetails({ selection }: TapbackDetailsProps) {
  const glyph = useMemo(
    () => (
      <TapbackGlyph
        type={"type" in selection ? selection.type : undefined}
        emoji={"emoji" in selection ? selection.emoji : undefined}
        size={m.balloon.glyph}
      />
    ),
    [selection],
  );
  return (
    <View style={styles.host} pointerEvents="none">
      <ThemedCard uniProps={cardTheme} glyph={glyph} />
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: "50%",
    marginLeft: -m.width / 2,
    top: m.top,
    width: m.width,
    height: m.height,
  },
  card: {
    width: m.width,
    height: m.height,
    borderRadius: m.radius,
    overflow: "hidden",
  },
  balloon: {
    position: "absolute",
    ...BALLOON_BOX,
  },
  trail: {
    position: "absolute",
  },
  glyph: {
    position: "absolute",
    ...GLYPH_BOX,
  },
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    top: m.avatarCenterY + m.avatar / 2 + 6,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.25,
  },
});
