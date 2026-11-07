/**
 * The mascot on the composer, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/mascot/mascot.ts`,
 * `mascot-frame.css` and `mascot.manifest.ts`.
 *
 * The mascot stands on the composer card — `conversation-width.css` lists
 * the scroller as `(messages, composer, mascot)`. Deepy and Whalegirl inset
 * from the card edge by the composer's side clearance + 8px
 * (`mascot-frame.css`). Which character is out is the `mascot` preference
 * (`brand` follows the brand, `crab`/`deepy`/`whalegirl` pick one, `off`
 * shows none), written to `body` as `MASCOT_ATTR`; where it stands is the
 * `mascotScope` preference (`home` alone, or `all` = home + conversation).
 *
 * The state machine lives in `mascot-stage.ts` and the signals in
 * `mascot-signals.ts`; this component plays the sheet the stage picks.
 */
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useAppSettings } from "@/hooks/use-settings";
import { Mascot, type MascotSignal } from "./mascot";
import { mascotLevel, type MascotReading } from "./mascot-signals";

export interface ComposerMascotProps {
  /** The agent is working (thinking or tool calls in flight). */
  isTurnActive: boolean;
  /** A tool result failed recently. */
  didError?: boolean;
  /** A panel is waiting on the reader (approval, question). */
  pendingInteraction?: boolean;
  /** Top-level sessions running across the workspace. */
  busySessions?: number;
  testID?: string;
}

/** Resolves the `mascot` pref to a character. `brand` follows the brand. */
export function resolveMascotCharacter(choice: "brand" | "crab" | "deepy" | "whalegirl" | "off"): "crab" | "deepy" | "whalegirl" | null {
  if (choice === "off") return null;
  if (choice === "brand") return "crab";
  return choice;
}

/**
 * The mascot standing on the composer card. Hidden when the choice is
 * `off`, or when the scope is `home` and a conversation is open.
 */
export function ComposerMascot({
  isTurnActive,
  didError,
  pendingInteraction,
  busySessions = 0,
  testID,
}: ComposerMascotProps) {
  const { settings } = useAppSettings();

  const character = useMemo(() => resolveMascotCharacter(settings.mascot), [settings.mascot]);

  const reading = useMemo<MascotReading>(
    () => ({
      sessionId: settings.mascotScope === "home" ? null : "active",
      running: isTurnActive,
      pendingInteraction: pendingInteraction ?? false,
      subagentPendingInteraction: false,
      busySessions,
      juggling: 0,
      compacting: false,
      phase: isTurnActive ? "thinking" : null,
    }),
    [busySessions, isTurnActive, pendingInteraction, settings.mascotScope],
  );

  const level = useMemo(() => mascotLevel(reading), [reading]);
  const state = (didError ? "error" : (level.animation as MascotSignal)) satisfies MascotSignal;

  const source = useMemo(() => ({ uri: "" }), []);

  if (!character) return null;

  return (
    <View testID={testID ?? "composer-mascot"} style={styles.mascot} pointerEvents="none">
      <Mascot state={state} source={source} />
    </View>
  );
}

const styles = StyleSheet.create({
  mascot: {
    position: "absolute",
    top: -28,
    right: 24,
  },
});
