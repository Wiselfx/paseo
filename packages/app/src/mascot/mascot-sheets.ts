/**
 * Claude-style mascot sprite sheets, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/mascot/sheets.ts` and the PNG strips
 * in `packages/assets/src/mascot/{crab,deepy,whalegirl}/`.
 *
 * The web skin plays each strip as a WAAPI `steps()` translation of a crop
 * window. React Native does that by translating an `Image` that carries the
 * whole strip inside a clipped container: the wrapper clips to one cell and
 * the strip translates by the cell size each frame. The math is the same
 * shape on both sides — `x = boxX + column * cellWidth`,
 * `y = boxY + row * cellHeight`, where `cellWidth = boxW * scale` and
 * `cellHeight = boxH * scale`.
 *
 * Sheets are bundled as PNGs under `assets/`. The crab is the default
 * character (Claude Code's pixel crab); Deepy and Whalegirl ship as assets
 * and select through `MascotCharacter`.
 */

import type { MascotSheet } from "./mascot";

export type { MascotSheet } from "./mascot";

/** The composer crab's animations, from `sheets.ts` `CRAB_SHEETS`. */
export const CRAB_SHEETS: Record<string, MascotSheet> = {
  idle: { frames: 24, box: [24, 20, 24, 16], still: 0 },
  "idle-look": { frames: 31, box: [24, 20, 24, 16], still: 0 },
  "idle-wave": { frames: 12, box: [24, 15, 24, 21], still: 0 },
  "idle-laptop": { frames: 43, box: [14, 13, 34, 23], still: 0 },
  thinking: { frames: 48, box: [20, 0, 30, 36], still: 24 },
  typing: { frames: 6, box: [15, 22, 28, 14], still: 0 },
  music: { frames: 16, box: [19, 9, 31, 27], still: 0 },
  conducting: { frames: 24, box: [20, 12, 29, 24], still: 0 },
  building: { frames: 6, box: [15, 19, 28, 17], still: 0 },
  error: { frames: 24, box: [23, 11, 26, 25], still: 4 },
  happy: { frames: 32, box: [18, 6, 34, 30], still: 3 },
  notification: { frames: 16, box: [24, 8, 24, 28], still: 0 },
  compacting: { frames: 20, box: [21, 20, 30, 16], still: 3 },
  sleeping: { frames: 32, box: [18, 1, 31, 35], still: 0 },
  waking: { frames: 12, box: [24, 4, 24, 32], still: 11 },
  "poke-left": { frames: 10, box: [24, 20, 27, 16], still: 0 },
  "poke-right": { frames: 10, box: [21, 20, 27, 16], still: 0 },
  tickle: { frames: 16, box: [23, 18, 26, 18], still: 0 },
  drag: { frames: 8, box: [23, 12, 26, 22], still: 0 },
} as const;

/** The crab is drawn at 2 device pixels per logical cell. */
export const CRAB_SCALE = 2;
/** The crab's frame pace (Claude Code's own). */
export const CRAB_FRAME_MS = 80;

/** Frames per sheet row (eight unless the strip says otherwise). */
export function sheetColumns(sheet: MascotSheet): number {
  return sheet.columns ?? 8;
}

/** The cell's size in device pixels. */
export function sheetCellSize(sheet: MascotSheet, scale: number): { width: number; height: number } {
  return { width: sheet.box[2] * scale, height: sheet.box[3] * scale };
}

/** Where frame `frame` sits inside the strip, in device pixels. */
export function sheetFrameOffset(
  sheet: MascotSheet,
  frame: number,
  scale: number,
): { x: number; y: number } {
  const columns = sheetColumns(sheet);
  const cell = sheetCellSize(sheet, scale);
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  return { x: sheet.box[0] * scale + column * cell.width, y: sheet.box[1] * scale + row * cell.height };
}
