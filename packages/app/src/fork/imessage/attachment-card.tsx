/**
 * Fork (imessage): the file attachment card.
 *
 * Ported from `ref/message-ui/registry/imessage/message-attachment.tsx` L64-80 (iOS row).
 * Card 280.5x100 radius 19, icon 44x58 at (18,21), title 17/22 semibold (600) tracked 0
 * at top 31, subtitle 13/16 at top 53, text at left 74 right 14. Fill/title/subtitle
 * use the iOS incoming grey + secondary label (ref L51-53, i.e. #e9e9eb/#262629 +
 * #8a8a8e/#8d8d93), which the reference keeps because the macOS #3b3b3d "reads
 * wrong beside iOS bubbles" (ref L43-46).
 *
 * Icon delta: the reference renders `DocumentIcon` (ref L95-125), a traced macOS
 * folded-corner page with gradients/shadow. It is SVG-that-needs-preserveAspectRatio-
 * none + gradient defs; react-native-svg can draw paths, but the traced silhouette
 * is artwork, not a measured constant, so Paseo keeps its own attachment icon.
 * The 44x58 box, the greys and the type are measured; the document silhouette is
 * the one unported piece and is reported, not faked.
 */
import { memo, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { bubblePalette } from "./palette";

export const attachmentCardMetrics = {
  // Reference message-attachment.tsx L73-79 (iOS, unverified against a capture;
  // macOS L66-72 is measured, iOS is re-proportioned) + L14-22 table.
  width: 280.5,
  height: 100,
  radius: 19,
  iconWidth: 44,
  iconHeight: 58,
  iconLeft: 18,
  iconTop: 21,
  textLeft: 74,
  textRight: 14,
  titleSize: 17,
  titleLine: 22,
  titleTop: 31,
  titleTracking: 0,
  subtitleSize: 13,
  subtitleLine: 16,
  subtitleTop: 53,
  subtitleTracking: 0,
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
  background: string;
  titleColor: string;
  subtitleColor: string;
}

function AttachmentCardBase({ title, subtitle, icon, background, titleColor, subtitleColor }: CardProps) {
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
  const cardStyle = useMemo(() => [styles.card, { backgroundColor: background }], [background]);
  return (
    <View style={cardStyle}>
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
  return {
    background: palette.background,
    titleColor: palette.foreground,
    subtitleColor: palette.muted,
  };
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
    borderRadius: attachmentCardMetrics.radius,
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
    letterSpacing: attachmentCardMetrics.titleTracking,
  },
  subtitle: {
    position: "absolute",
    ...TEXT_BOX,
    fontWeight: "400",
    letterSpacing: attachmentCardMetrics.subtitleTracking,
  },
});
