/**
 * Fork (imessage): the bubble silhouette.
 *
 * A rounded rectangle is not good enough next to the real thing. iOS replaces the
 * bottom corner on the speaker's side with a tail whose edge sweeps *inward* into
 * a neck, bulges back out, and ends in a point that hangs below the body. The
 * corner-radius shortcut reads as a rounded box the instant you compare them.
 *
 * The Béziers below are traced from iOS 26 Messages and ported from
 * `theswerd/imessage-ui` (`registry/imessage/bubble-shape.ts`, MIT). They are
 * measured in points relative to the body's bottom corner, so the same numbers
 * work at any bubble size: the tail box is a fixed 22 × 21.2pt and never scales
 * with the text.
 */

export type TailSide = "left" | "right" | "none";

/** iOS Messages bubble metrics, also traced: 17pt text, 10pt padding, 20pt corners. */
export const BUBBLE_RADIUS = 20.0107;
export const BUBBLE_PADDING_X = 13.85;
export const BUBBLE_PADDING_Y = 10;
export const BUBBLE_MAX_WIDTH = 280.5;
export const BUBBLE_MIN_WIDTH = 48;

/** The fixed tail box: 22 wide, 21.2 tall, hanging 6.8 below the body. */
export const TAIL_BOX = { width: 22, height: 21.2, hang: 6.8 } as const;

/** Where the straight side edge ends and the S-curve into the neck begins. */
const TAIL_START_Y = -19.203;
/** Cubic Béziers relative to the body's bottom corner (x grows right, y grows down). */
const TAIL_SEGMENTS: readonly [number, number, number, number, number, number][] = [
  // s-curve from the straight side edge down into the neck
  [-0.442, -13.682, -3.003, -8.238, -7.457, -4.87],
  [-9.101, -3.553, -10.598, -1.75, -10.513, 0.463],
  // bulge from the neck down to the tip
  [-10.766, 2.71, -8.409, 4.088, -8.319, 6.13],
  // rounded tip
  [-8.33, 6.55, -8.6, 6.75, -9.0, 6.698],
  // underside from the tip back to the body's bottom edge
  [-14.001, 6.333, -17.413, 1.539, -22.0, 0],
];

function fmt(value: number): string {
  return Number(value.toFixed(3)).toString();
}

/**
 * The whole bubble as one closed path, in body coordinates.
 *
 * Drawing the silhouette in a single path — rather than a rounded View plus a
 * tail patch — is what removes the hairline seam where two shapes meet, and it
 * lets the tail's neck actually cut into the body's corner.
 *
 * @param height Body height, excluding the tail's hang.
 */
export function bubblePath(
  width: number,
  height: number,
  side: TailSide,
  radius = BUBBLE_RADIUS,
): string {
  const r = Math.min(radius, height / 2, width / 2);
  if (side === "none") {
    return [
      `M${fmt(r)},0`,
      `H${fmt(width - r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 ${fmt(width)},${fmt(r)}`,
      `V${fmt(height - r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 ${fmt(width - r)},${fmt(height)}`,
      `H${fmt(r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 0,${fmt(height - r)}`,
      `V${fmt(r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 ${fmt(r)},0`,
      "Z",
    ].join(" ");
  }

  const mx = (x: number) => (side === "right" ? width + x : -x);
  const my = (y: number) => height + y;
  const tail: string[] = [`L${fmt(mx(0))},${fmt(my(TAIL_START_Y))}`];
  for (const [x1, y1, x2, y2, x, y] of TAIL_SEGMENTS) {
    tail.push(
      `C${fmt(mx(x1))},${fmt(my(y1))} ${fmt(mx(x2))},${fmt(my(y2))} ${fmt(mx(x))},${fmt(my(y))}`,
    );
  }

  if (side === "right") {
    return [
      `M${fmt(r)},0`,
      `H${fmt(width - r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 ${fmt(width)},${fmt(r)}`,
      ...tail,
      `H${fmt(r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 0,${fmt(height - r)}`,
      `V${fmt(r)}`,
      `A${fmt(r)},${fmt(r)} 0 0 1 ${fmt(r)},0`,
      "Z",
    ].join(" ");
  }

  // Left tail: walk the outline counter-clockwise so the mirrored segments read in order.
  return [
    `M${fmt(width - r)},0`,
    `H${fmt(r)}`,
    `A${fmt(r)},${fmt(r)} 0 0 0 0,${fmt(r)}`,
    ...tail,
    `H${fmt(width - r)}`,
    `A${fmt(r)},${fmt(r)} 0 0 0 ${fmt(width)},${fmt(height - r)}`,
    `V${fmt(r)}`,
    `A${fmt(r)},${fmt(r)} 0 0 0 ${fmt(width - r)},0`,
    "Z",
  ].join(" ");
}
