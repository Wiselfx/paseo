/**
 * Fork (imessage): the file attachment card.
 *
 * Messages draws a document message as a card, not as text in a bubble, and the card is grey in
 * **both** directions — your own file goes grey too. That is why `ChatBubble` grew a `tone`.
 *
 * Geometry from `message-attachment.tsx` (iOS variant, which that kit marks unverified against a
 * capture; the macOS numbers it was scaled from are measured):
 *
 * - card 280.5 × 100 with the bubble's radius and its tail;
 * - a 44 × 58 page glyph at (18, 21);
 * - the filename at 17/22, ink starting 74 in and its box top 31 below the card's;
 * - the subtitle at 13/16, box top 53.
 *
 * The card fill, filename and subtitle ink are the measured incoming grey and label pair.
 * The glyph is Paseo's own attachment icon rather than Apple's traced document page: the box and
 * the type are ported, the artwork is not, and pretending otherwise would be a lie about the one
 * thing here that is not measured.
 */
import { memo, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { bubblePalette } from "./palette";

export const attachmentCardMetrics = {
  width: 280.5,
  height: 100,
  iconWidth: 44,
  iconHeight: 58,
  iconLeft: 18,
  iconTop: 21,
  textLeft: 74,
  textRight: 14,
  titleSize: 17,
  titleLine: 22,
  titleTop: 31,
  subtitleSize: 13,
  subtitleLine: 16,
  subtitleTop: 53,
} as const;

const ICON_BOX = {
  left: attachmentCardMetrics.iconLeft,
  top: attachmentCardMetrics.iconTop,
  width: attachmentCardMetrics.iconWidth,
  height: attachmentCardMetrics.iconHeight,
} as const;

const TEXT_BOX = {
  left: attachmentCardMetrics.textLeft,
  right: attachmentCardMetrics.textRight,
} as const;

interface CardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  titleColor: string;
  subtitleColor: string;
}

function AttachmentCardBase({ title, subtitle, icon, titleColor, subtitleColor }: CardProps) {
  const titleStyle = useMemo(
    () => [
      styles.title,
      {
        color: titleColor,
        fontSize: attachmentCardMetrics.titleSize,
        lineHeight: attachmentCardMetrics.titleLine,
        top: attachmentCardMetrics.titleTop,
      },
    ],
    [titleColor],
  );
  const subtitleStyle = useMemo(
    () => [
      styles.subtitle,
      {
        color: subtitleColor,
        fontSize: attachmentCardMetrics.subtitleSize,
        lineHeight: attachmentCardMetrics.subtitleLine,
        top: attachmentCardMetrics.subtitleTop,
      },
    ],
    [subtitleColor],
  );
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={titleStyle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={subtitleStyle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
}

const ThemedCard = withUnistyles(AttachmentCardBase);

const cardTheme = (theme: Theme) => {
  const palette = bubblePalette("agent", theme.colorScheme);
  return { titleColor: palette.foreground, subtitleColor: palette.muted };
};

export interface AttachmentCardProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
}

export const AttachmentCard = memo(function AttachmentCard(props: AttachmentCardProps) {
  return <ThemedCard {...props} uniProps={cardTheme} />;
});

const styles = StyleSheet.create({
  card: {
    width: attachmentCardMetrics.width,
    height: attachmentCardMetrics.height,
  },
  iconBox: {
    position: "absolute",
    ...ICON_BOX,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    position: "absolute",
    ...TEXT_BOX,
    fontWeight: "600",
    letterSpacing: 0,
  },
  subtitle: {
    position: "absolute",
    ...TEXT_BOX,
    fontWeight: "400",
    letterSpacing: 0,
  },
});
