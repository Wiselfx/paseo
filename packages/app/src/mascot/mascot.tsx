/**
 * Claude-style mascot: the composer character from `Nwflower/dsh-claude-style`.
 *
 * Source: `packages/client/src/features/mascot/` plus
 * `packages/assets/src/mascot/{crab,deepy,whalegirl}/` and the sheet tables
 * in `packages/client/src/features/mascot/sheets.ts`.
 *
 * The web skin plays PNG sheet strips as WAAPI `steps()` translations of a
 * crop window, with the mascot's *inks* painted as a second sheet through a
 * stylesheet. React Native cannot crop a sheet with CSS custom properties,
 * so the strips are played by translating an `Image` inside a clipped
 * container: the `Image` carries the whole strip, the wrapper clips to one
 * cell, and the strip translates by the cell size each frame. The ink mask
 * becomes a second `Image` at the theme's quiet ink, composited at low
 * alpha — the unmasked sheet remains the base so the character is readable
 * even without a theme ink value.
 *
 * States mirror `mascot-signals.ts` priorities:
 * `idle(1) → thinking(2) → working(3) → compacting(6) → notification(7)`,
 * with one-off moments `error` and `attention`.
 */

import { useEffect, useMemo, useState } from "react";
import { Image, View, type ImageStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

export type MascotState =
  | "idle"
  | "thinking"
  | "typing"
  | "music"
  | "building"
  | "compacting"
  | "notification"
  | "error"
  | "happy"
  | "sleeping"
  | "waking";

/** What the agent is doing, as a mascot state. */
export type MascotSignal = MascotState | "attention";

/** One animation's sheet: frame count, crop box in logical pixels, still frame. */
export interface MascotSheet {
  frames: number;
  box: readonly [number, number, number, number];
  still: number;
  /** Per-frame durations; absent means `frames` equal `frameMs` frames. */
  durs?: readonly number[];
  /** Frames per sheet row (eight when absent); a single-row strip sets this to its frame count. */
  columns?: number;
}

/** Transparent margin one frame cell carries, from `mascot-player.ts` GUTTER. */
export const MAScot_GUTTER = 1;

/** Frames per second of the crab (Claude Code's own pace). */
export const MAScot_FRAME_MS = 80;

/**
 * The crab's animation table, from `sheets.ts` `CRAB_SHEETS`. The crab is
 * drawn on a 52×36 grid at 2px a cell; `box` is in cells.
 */
export const CRAB_SHEETS: Record<string, MascotSheet> = {
  "idle": { frames: 24, box: [24, 20, 24, 16], still: 0 },
  "idle-look": { frames: 31, box: [24, 20, 24, 16], still: 0 },
  "idle-wave": { frames: 12, box: [24, 15, 24, 21], still: 0 },
  "idle-laptop": { frames: 43, box: [14, 13, 34, 23], still: 0 },
  "thinking": { frames: 48, box: [20, 0, 30, 36], still: 24 },
  "typing": { frames: 6, box: [15, 22, 28, 14], still: 0 },
  "music": { frames: 16, box: [19, 9, 31, 27], still: 0 },
  "conducting": { frames: 24, box: [20, 12, 29, 24], still: 0 },
  "building": { frames: 6, box: [15, 19, 28, 17], still: 0 },
  "error": { frames: 24, box: [23, 11, 26, 25], still: 4 },
  "happy": { frames: 32, box: [18, 6, 34, 30], still: 3 },
  "notification": { frames: 16, box: [24, 8, 24, 28], still: 0 },
  "compacting": { frames: 20, box: [21, 20, 30, 16], still: 3 },
  "sleeping": { frames: 32, box: [18, 1, 31, 35], still: 0 },
  "waking": { frames: 12, box: [24, 4, 24, 32], still: 11 },
  "poke-left": { frames: 10, box: [24, 20, 27, 16], still: 0 },
  "poke-right": { frames: 10, box: [21, 20, 27, 16], still: 0 },
  "tickle": { frames: 16, box: [23, 18, 26, 18], still: 0 },
  "drag": { frames: 8, box: [23, 12, 26, 22], still: 0 },
} as const;

/** Priority table from `mascot-signals.ts`. Higher outranks lower. */
export const MASCOT_PRIORITY: Record<MascotSignal, number> = {
  "idle": 1,
  "thinking": 2,
  "typing": 3,
  "music": 3,
  "building": 3,
  "compacting": 6,
  "notification": 7,
  "error": 8,
  "happy": 4,
  "attention": 7,
  "sleeping": 0,
  "waking": 0,
} as const;

/** Which animation answers which state. */
export const MASCOT_ANIMATION: Record<MascotSignal, string> = {
  "idle": "idle",
  "thinking": "thinking",
  "typing": "typing",
  "music": "music",
  "building": "building",
  "compacting": "compacting",
  "notification": "notification",
  "error": "error",
  "happy": "happy",
  "attention": "notification",
  "sleeping": "sleeping",
  "waking": "waking",
} as const;

export interface MascotProps {
  state: MascotSignal;
  /** Sheet source for the current state. Resolved by the caller from the assets. */
  source: { uri: string } | number;
  /** Logical pixels per cell stride (crab: 2). */
  scale?: number;
  /** Display width of one cell in points. */
  size?: number;
  testID?: string;
}

/**
 * Plays one mascot sheet. The strip translates inside a clipped window;
 * reduced motion shows the sheet's still frame instead of stepping.
 */
export function Mascot({ state, source, scale = 2, testID }: MascotProps) {
  const reducedMotion = useReducedMotion();
  const animation = MASCOT_ANIMATION[state];
  const sheet = CRAB_SHEETS[animation] ?? CRAB_SHEETS["idle"]!;
  const [frame, setFrame] = useState(sheet.still);

  useEffect(() => {
    if (reducedMotion) {
      setFrame(sheet.still);
      return undefined;
    }
    const frameMs = sheet.durs?.[frame] ?? MAScot_FRAME_MS;
    const handle: ReturnType<typeof setTimeout> = setTimeout(() => {
      setFrame((previous) => (previous + 1) % sheet.frames);
    }, frameMs);
    return () => clearTimeout(handle);
  }, [frame, reducedMotion, sheet.frames, sheet.still, sheet.durs]);

  const columns = sheet.columns ?? 8;
  const cellWidth = sheet.box[2] + MAScot_GUTTER * 2;
  const cellHeight = sheet.box[3] + MAScot_GUTTER * 2;
  // The strip translation that puts one frame in the window
  // (`frameOffset` in `mascot-player.ts`): -(column * cellWidth + GUTTER) on
  // x and -(row * cellHeight + GUTTER) on y, times the 2px scale. The window
  // is the crop box itself.
  const offsetX = -(((frame % columns) * cellWidth + MAScot_GUTTER) * scale);
  const offsetY = -((Math.floor(frame / columns) * cellHeight + MAScot_GUTTER) * scale);
  const stripStyle = useMemo<ImageStyle>(
    () => ({
      width: columns * cellWidth * scale,
      height: cellHeight * Math.ceil(sheet.frames / columns) * scale,
      transform: [{ translateX: offsetX }, { translateY: offsetY }],
    }),
    [columns, cellWidth, cellHeight, sheet.frames, offsetX, offsetY, scale],
  );
  const windowStyle = useMemo(
    () => ({ width: sheet.box[2] * scale, height: sheet.box[3] * scale, overflow: "hidden" as const }),
    [sheet.box, scale],
  );

  return (
    <View testID={testID} style={windowStyle} pointerEvents="none">
      <Image source={source} style={stripStyle} />
    </View>
  );
}
