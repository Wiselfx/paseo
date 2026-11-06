/**
 * Fork (imessage): hold the stream, release it as finished bubbles.
 *
 * The upstream reveal paces characters so the text appears to be written. This
 * fork does the opposite: nothing appears until a block is complete, and then it
 * arrives whole. That is a rendering decision only — the deltas still arrive, the
 * store still holds the full message, and copy/selection/find all see the same
 * text they always did.
 *
 * All the bookkeeping lives in `pop-state.ts`; this hook is the clock. It re-reads
 * the committed blocks on every tick instead of trusting a queue, and it flushes
 * everything the moment the turn ends.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { completeBlocks, splitMessageBlocks } from "./blocks";
import {
  EMPTY_POP_STATE,
  flushAll,
  nextPop,
  reconcile,
  type PopState,
} from "./pop-state";
import { POP_INTERVAL_MS } from "./pop-queue";
import { popSenses } from "./senses";

export interface PoppedBlocks {
  /** Bubbles to render, oldest first. */
  blocks: string[];
  /** Bumped when the bubbles were dropped because the message changed under them. */
  generation: number;
  /** The model is still working and the typing bubble belongs below the last block. */
  typing: boolean;
}

export function usePoppedBlocks(text: string, phase: "streaming" | "complete"): PoppedBlocks {
  const parsed = useMemo(() => splitMessageBlocks(text), [text]);
  const committed = useMemo(
    () => (phase === "complete" ? completeBlocks(parsed) : parsed.completed),
    [parsed, phase],
  );

  const [state, setState] = useState<PopState>(EMPTY_POP_STATE);
  const stateRef = useRef(state);
  const committedRef = useRef(committed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timers and effects read these refs, so they must be current before paint.
  committedRef.current = committed;

  const apply = (next: PopState) => {
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
  };

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const current = reconcile(stateRef.current, committedRef.current);
    apply(current);

    if (phase === "complete") {
      clearTimer();
      const step = flushAll(current, committedRef.current);
      apply(step.state);
      if (step.item) popSenses({ first: current.bubbles.length === 0 });
      return;
    }

    const pump = () => {
      timerRef.current = null;
      const step = nextPop(stateRef.current, committedRef.current);
      if (!step.item) return;
      apply(step.state);
      popSenses({ first: step.state.bubbles.length === 1 });
      if (committedRef.current.length > step.state.consumed) {
        timerRef.current = setTimeout(pump, POP_INTERVAL_MS);
      }
    };

    if (committedRef.current.length > current.consumed && timerRef.current === null) {
      pump();
    }
  }, [committed, phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  return {
    blocks: state.bubbles,
    generation: state.generation,
    typing: phase === "streaming",
  };
}
