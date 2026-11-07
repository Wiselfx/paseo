/**
 * Claude-style process column, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/process-column/process-column.css`
 * and `process-column.ts`, plus `constants.ts` `PROCESS_ROWS_FLAT/COLUMN`.
 *
 * An open process group draws as one card instead of the host's own list:
 * the body becomes the card, its rows stand one under another with a
 * separator between them, and each row keeps its own disclosure. The body
 * keeps the host's own window — the `min(400px, 50vh)` cap and scrollbar
 * where the host caps a group, no height where its tier lifts the cap — so
 * a long group scrolls inside the card rather than growing the transcript.
 * The shape takes the ladder's 8px radius and the 1px card border, the
 * separators the 0.5px divider (docs/STYLE.md).
 */

export type ProcessRowsLayout = "flat" | "column";

/** The card's radius, from the ladder's 8px radius. */
export const PROCESS_CARD_RADIUS = 8;
/** The card's border, from the 1px card border. */
export const PROCESS_CARD_BORDER_WIDTH = 1;
/** The separator between rows, from the 0.5px divider. */
export const PROCESS_SEPARATOR_WIDTH = 0.5;
/** The row's min-height inside the card (the press whole line). */
export const PROCESS_ROW_MIN_HEIGHT = 36;
/** The cap where the host caps a group: `min(400px, 50vh)`. */
export const PROCESS_MAX_HEIGHT = 400;
/** The inset the card gives its rows. */
export const PROCESS_ROW_INSET = 12;

/** Whether the column layout is chosen. `flat` is the host's own list. */
export function processColumnEnabled(layout: ProcessRowsLayout): boolean {
  return layout === "column";
}

/** The card's border colour for the light theme. */
export function processBorderColour(theme: "light" | "dark"): string {
  return theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
}
