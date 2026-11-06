/**
 * Fork (imessage): the pop queue policy.
 *
 * Blocks finish faster than a human-paced pop can play, so arrival and delivery
 * are decoupled: blocks land in a queue and the queue releases them one at a
 * time. This mirrors iMessage, where a message appears when it is *sent*, not as
 * it is typed — except a model can finish five paragraphs inside one frame.
 *
 * The policy is deliberately dull, because the alternative is a scheduler that
 * only behaves when the backlog grows at exactly the predicted rate:
 *
 * - Small backlog: one block per bubble. `pop pop pop`.
 * - Backlog over the threshold: the first block pops alone, then the rest land as
 *   one bubble. A burst keeps its rhythm at the start and never makes the reader
 *   wait through eight separate pops.
 */

/** Minimum spacing between two pops, so a burst reads as bubbles landing. */
export const POP_INTERVAL_MS = 150;

/** Past this many waiting blocks, the rest of the burst merges into one bubble. */
export const POP_COALESCE_THRESHOLD = 3;

export interface PopPlanItem {
  /** Markdown for one bubble. */
  text: string;
  /** How many committed blocks this bubble consumes. */
  blocks: number;
}

export interface NextBubbleInput {
  /** Committed blocks not yet delivered, in document order. */
  pending: readonly string[];
  /** Whether the previous pop opened a burst that has not been merged yet. */
  burstOpen: boolean;
}

export interface NextBubble {
  item: PopPlanItem;
  /** What the flag should be for the *next* call. */
  burstOpen: boolean;
}

/**
 * Decide the next bubble, and whether the burst continues after it.
 *
 * Returns null when there is nothing to deliver.
 */
export function nextBubble({ pending, burstOpen }: NextBubbleInput): NextBubble | null {
  const blocks = pending.filter((block) => block.trim().length > 0);
  if (blocks.length === 0) return null;

  const overBudget = blocks.length > POP_COALESCE_THRESHOLD;
  const first = blocks[0] ?? "";

  if (overBudget && burstOpen) {
    return {
      item: { text: blocks.join("\n\n"), blocks: blocks.length },
      burstOpen: false,
    };
  }

  const remaining = blocks.length - 1;
  return {
    item: { text: first, blocks: 1 },
    burstOpen: remaining > POP_COALESCE_THRESHOLD,
  };
}
