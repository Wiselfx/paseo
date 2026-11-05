/**
 * Fork (imessage): the pop queue.
 *
 * Blocks finish faster than a human-paced pop can play, so arrival and delivery
 * are decoupled: blocks land in a queue and the queue releases them one at a
 * time. This mirrors iMessage, where a message appears when it is *sent*, not as
 * it is typed — except a model can finish five paragraphs inside one frame.
 *
 * Pure policy, no timers: `planPops` decides what the backlog becomes, and the
 * caller drains it on `POP_INTERVAL_MS`.
 */

/** Minimum spacing between two pops, so a burst reads as bubbles landing. */
export const POP_INTERVAL_MS = 150;

/** Past this many waiting blocks, the extra blocks merge into one bubble. */
export const POP_COALESCE_THRESHOLD = 3;

/** Blocks that always pop on their own, however long the backlog is. */
export const POP_ALWAYS_SEPARATE = 2;

export interface PopPlanItem {
  /** Markdown for one bubble. */
  text: string;
  /** How many committed blocks this bubble consumes. */
  blocks: number;
}

/**
 * Turn a backlog of committed blocks into the bubbles it should become.
 *
 * Short backlogs stay one-bubble-per-block (`pop pop pop`). Long backlogs keep
 * their first couple of bubbles and merge the rest, so choreography never pushes
 * reading behind by more than a couple of hundred milliseconds.
 */
export function planPops(pending: readonly string[]): PopPlanItem[] {
  const blocks = pending.filter((block) => block.trim().length > 0);
  if (blocks.length === 0) return [];
  if (blocks.length <= POP_COALESCE_THRESHOLD) {
    return blocks.map((text) => ({ text, blocks: 1 }));
  }

  const head = blocks.slice(0, POP_ALWAYS_SEPARATE).map((text) => ({ text, blocks: 1 }));
  const rest = blocks.slice(POP_ALWAYS_SEPARATE);
  return [...head, { text: rest.join("\n\n"), blocks: rest.length }];
}
