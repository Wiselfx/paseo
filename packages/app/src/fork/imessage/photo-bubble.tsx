/**
 * Fork (imessage): a photo message — the image *is* the bubble.
 *
 * A photo takes the balloon's shape: 252.667 wide (the measured photo balloon width), a tail
 * when it ends its group, and the corner radius of the traced text bubble. Bothered heights on
 * device: 189.7 for 4:3, 252.7 for 1:1 and 337.0 for 3:4, so the height follows the image's own
 * aspect up to a 337 cap rather than being fixed.
 *
 * The reference kit clips the photo with the same SVG outline it fills for text. React Native
 * cannot clip to a path without a mask layer, so the image carries the measured corner radius
 * and sits inside the bubble's padding box; the one visible difference is the tail, which is
 * drawn by the bubble behind the photo (the photo's bottom edge is flat where the tail meets it).
 */
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { useAttachmentPreviewUrl } from "@/attachments/use-attachment-preview-url";
import type { AttachmentMetadata } from "@/attachments/types";

import { BUBBLE_RADIUS } from "./shape";

/** The measured photo balloon: 252.667 wide on an iPhone, capped at 337 tall. */
export const PHOTO_BALLOON = {
  width: 252.667,
  maxHeight: 337,
  minHeight: 126,
} as const;

export interface PhotoBubbleProps {
  image: AttachmentMetadata;
  accessibilityLabel?: string;
}

export function PhotoBubble({ image, accessibilityLabel }: PhotoBubbleProps) {
  const uri = useAttachmentPreviewUrl(image);
  const { width: windowWidth } = useWindowDimensions();
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        setAspect(height / width);
      },
      () => {
        if (!cancelled) setAspect(1);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const box = useMemo(() => {
    const balloonWidth = Math.min(PHOTO_BALLOON.width, windowWidth - 24);
    const ratio = aspect ?? 0.75;
    const height = Math.round(
      Math.min(
        PHOTO_BALLOON.maxHeight,
        Math.max(PHOTO_BALLOON.minHeight, balloonWidth * ratio),
      ),
    );
    return { width: balloonWidth, height };
  }, [aspect, windowWidth]);

  const imageStyle = useMemo(() => [box, styles.image], [box]);
  const source = useMemo(() => (uri ? { uri } : undefined), [uri]);

  if (!uri) {
    return <View style={[box, styles.placeholder]} />;
  }

  return (
    <Image
      source={source}
      style={imageStyle}
      resizeMode="contain"
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: "rgba(120,120,128,0.12)",
  },
  placeholder: {
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: "rgba(120,120,128,0.12)",
  },
});
