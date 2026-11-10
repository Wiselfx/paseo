import { isWeb } from "@/constants/platform";
import { claudeLightCard } from "@/styles/claude-tokens";

/**
 * OCU focus ring [R]: the same blue and glow in both schemes. Kept here so the
 * input, button, and switch rings cannot drift apart.
 */
const FOCUS_RING_COLOR = claudeLightCard.focusRing;
const FOCUS_RING_GLOW = claudeLightCard.focusRingGlow;

/** The exact styles a focus ring contributes; narrower than ViewStyle so a Unistyles sheet accepts it. */
export interface FocusRingStyle {
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
}

/**
 * The focus chrome every control shares. Outset only, so focusing never reflows
 * the row: a recoloured border plus a halo on web, and the same border plus a
 * soft shadow where the platform has no box-shadow.
 */
export function focusRingStyle(): FocusRingStyle {
  if (isWeb) {
    return {
      borderColor: FOCUS_RING_COLOR,
      boxShadow: `0 0 0 3px ${FOCUS_RING_GLOW}`,
    };
  }

  return {
    borderWidth: 1,
    borderColor: FOCUS_RING_COLOR,
    shadowColor: FOCUS_RING_COLOR,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  };
}

/**
 * Whether focus came from the keyboard. Web sets `:focus-visible` for keyboard
 * focus only, so a pointer click does not leave a ring behind.
 */
export function isKeyboardFocusVisible(): boolean {
  if (!isWeb) return true;
  if (typeof document === "undefined") return false;
  return document.activeElement?.matches(":focus-visible") ?? true;
}
