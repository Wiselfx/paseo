/**
 * Fork (imessage): a centred system notice (agent error/warning/info) rendered as an
 * iMessage transcript status line rather than a coloured card.
 *
 * Ported from `ref/message-ui/registry/imessage/system-message.tsx` (and its measured
 * rules); Paseo keeps the trigger and text. Measured rules carried over:
 *
 * - Type: 11pt on a 13.3333pt pitch, weight 400 (error 300), letter-spacing 0.12.
 * - Ink: `UIColor.secondaryLabel` -> #8a8a8e light / #8d8d93 dark (Paseo's
 *   `MESSAGES_PALETTE.secondaryLabel`). Error uses `systemRed` -> #ff3b30 light /
 *   #ff453a dark. Warning has no measured colour in the reference, so it inherits
 *   secondary ink.
 * - Item padding: `textAlignmentInsets` top 3 / bottom 3; edge inset 16; max column 370.
 * - No filled card, no glyph: the reference `SystemMessage` carries no glyph, so none
 *   is added here (do not invent one).
 *
 * Theme is read through `withUnistyles` (no `useUnistyles`), and layout is static.
 */
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { withUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";

import { MESSAGES_PALETTE } from "./palette";

export const systemMessageMetrics = {
  // iOS row of ref system-message.tsx L163-195: font 11, lineHeight 13.3333,
  // letterSpacing 0.12, weight 400, emphasisWeight 500, errorWeight 300,
  // padTop/padBottom 3, gapAbove 13.1667, inset 16. Measured deltas vs the
  // reference: none on type/spacing — this file already matched. `gapAbove`
  // is intentionally not in the style: the reference splits it as layout gap
  // (L148-158, “no gapBelow”), and the transcript row owns it; adding it here
  // would double-count (see Main's contract: fix measured deltas only). The
  // constant is recorded here without a new style prop. Punctuation is the
  // caller’s verbatim text (the reference’s statusTemplates L252-304 are
  // ChatKit format strings, not a formatting rule for Paseo’s notices).
  fontSize: 11,
  lineHeight: 13.3333,
  letterSpacing: 0.12,
  weight: 400,
  emphasisWeight: 500,
  errorWeight: 300,
  padTop: 3,
  padBottom: 3,
  gapAbove: 13.1667,
  inset: 16,
  maxWidth: 370,
} as const;

export interface SystemMessageProps {
  level: "info" | "warning" | "error";
  message: string;
}

interface SystemMessageBaseProps extends SystemMessageProps {
  /** Injected: secondary ink for the active appearance. */
  ink: string;
  /** Injected: error red for the active appearance. */
  errorInk: string;
}

function SystemMessageBase({ level, message, ink, errorInk }: SystemMessageBaseProps) {
  const isError = level === "error";
  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          {
            color: isError ? errorInk : ink,
            fontWeight: isError ? systemMessageMetrics.errorWeight : systemMessageMetrics.weight,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const ThemedSystemMessage = withUnistyles(SystemMessageBase);

const systemMessageTheme = (theme: Theme) => ({
  ink: MESSAGES_PALETTE[theme.colorScheme].secondaryLabel,
  errorInk: theme.colorScheme === "light" ? "#FF3B30" : "#FF453A",
});

export const SystemMessage = memo(function SystemMessage(props: SystemMessageProps) {
  return <ThemedSystemMessage {...props} uniProps={systemMessageTheme} />;
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingTop: systemMessageMetrics.padTop,
    paddingBottom: systemMessageMetrics.padBottom,
    paddingHorizontal: systemMessageMetrics.inset,
  },
  text: {
    maxWidth: systemMessageMetrics.maxWidth,
    fontSize: systemMessageMetrics.fontSize,
    lineHeight: systemMessageMetrics.lineHeight,
    letterSpacing: systemMessageMetrics.letterSpacing,
    textAlign: "center",
  },
});