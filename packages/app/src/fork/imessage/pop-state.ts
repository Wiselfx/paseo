/**
 * Fork (imessage): the pop state machine, as a pure value.
 *
 * The first draft tracked "how many blocks have I popped" as a ref and drained a
 * queue of planned bubbles. That is three sources of truth for one fact, and it
 * broke the moment the message underneath changed: a re-sent turn, a daemon
 * correction, or a flush that ran while the queue still held items could advance
 * the counter past the text and the reader lost the tail of the answer.
 *
 * So: the committed blocks are the truth, and this module only answers "what
 * should be on screen right now". Every step re-reads the committed list, which
 * makes ordering, flushing and rewriting impossible to get out of sync.
 */
import { nextBubble, type PopPlanItem } from "./pop-queue";

export interface PopState {
  /** Bubbles currently on screen, oldest first. */
  bubbles: string[];
  /** How many committed blocks those bubbles represent. */
  consumed: number;
  /** The consumed blocks, joined — the fingerprint used to detect a rewrite. */
  source: string;
  /** Bumped whenever the message under us changed and its bubbles were dropped. */
  generation: number;
  /** A burst started and its tail has not been merged yet. */
  burstOpen: boolean;
}

export const EMPTY_POP_STATE: PopState = {
  bubbles: [],
  consumed: 0,
  source: "",
  generation: 0,
  burstOpen: false,
};

/** Blocks are joined for comparison; the separator must not occur inside markdown. */
const JOIN = "\u0000";

function fingerprint(blocks: readonly string[]): string {
  return blocks.join(JOIN);
}

/**
 * Whether the bubbles on screen still describe the beginning of `committed`.
 *
 * A message that only grew keeps its bubbles. A message that was truncated,
 * edited or re-sent does not: the prefix no longer matches, and the only safe
 * move is to drop what we showed and pop the new text.
 */
export function isCurrent(state: PopState, committed: readonly string[]): boolean {
  if (state.consumed > committed.length) return false;
  if (state.consumed === 0) return true;
  return fingerprint(committed.slice(0, state.consumed)) === state.source;
}

/** Drop the bubbles if the message under them changed. */
export function reconcile(state: PopState, committed: readonly string[]): PopState {
  if (isCurrent(state, committed)) return state;
  return {
    bubbles: [],
    consumed: 0,
    source: "",
    generation: state.generation + 1,
    burstOpen: false,
  };
}

export interface PopStep {
  state: PopState;
  /** The bubble that just landed, or null when nothing was due. */
  item: PopPlanItem | null;
}

function advance(
  state: PopState,
  committed: readonly string[],
  item: PopPlanItem,
  burstOpen: boolean,
): PopState {
  const consumed = state.consumed + item.blocks;
  return {
    ...state,
    bubbles: [...state.bubbles, item.text],
    consumed,
    source: fingerprint(committed.slice(0, consumed)),
    burstOpen,
  };
}

/**
 * Release the next bubble.
 *
 * One bubble per call, whatever the backlog — pacing belongs to the caller. The
 * plan is recomputed from the live backlog every time, so a burst that grows
 * while it is being delivered coalesces instead of arriving stale.
 */
export function nextPop(state: PopState, committed: readonly string[]): PopStep {
  const step = nextBubble({ pending: committed.slice(state.consumed), burstOpen: state.burstOpen });
  if (!step) return { state, item: null };
  return {
    state: advance(state, committed, step.item, step.burstOpen),
    item: step.item,
  };
}

/**
 * The turn is over: release everything left as one bubble.
 *
 * Nothing should wait on choreography once the answer is final, and a queue of
 * eight pops after the turn ended is eight chances to look broken.
 */
export function flushAll(state: PopState, committed: readonly string[]): PopStep {
  const pending = committed.slice(state.consumed);
  const drain: PopState = {
    ...state,
    consumed: committed.length,
    source: fingerprint(committed),
    burstOpen: false,
  };
  if (pending.length === 0) return { state: drain, item: null };
  const text = pending.join("\n\n").trim();
  if (text.length === 0) return { state: drain, item: null };
  const item: PopPlanItem = { text, blocks: pending.length };
  return {
    state: { ...drain, bubbles: [...state.bubbles, text] },
    item,
  };
}
