/**
 * Fork (imessage): the composer's frosted field.
 *
 * Messages' input bar is a translucent material the conversation blurs through,
 * not a grey box. The stainless details live in `glass.tsx`; this is the field's
 * placement and its slightly denser fill, because a field you type into wants a
 * touch more body than a button you tap.
 */
import { StyleSheet } from "react-native";

import type { Theme } from "@/styles/theme";

import { GlassSurface } from "./glass";

/** 0.82 over the blur: denser than a button, so body text never fights what is under it. */
function fieldTint(theme: Theme): string {
  return theme.colorScheme === "light" ? "rgba(255,255,255,0.82)" : "rgba(28,28,28,0.82)";
}

/** Messages' field corner: a plain circular radius 20, not a continuous corner. */
export const COMPOSER_RADIUS = 20;

export interface ComposerGlassProps {
  radius?: number;
}

export function ComposerGlass({ radius = COMPOSER_RADIUS }: ComposerGlassProps) {
  return (
    <GlassSurface
      pointerEvents="none"
      radius={radius}
      tint={fieldTint}
      style={StyleSheet.absoluteFill}
    />
  );
}
