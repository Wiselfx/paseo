/**
 * Fork (imessage): hold the stream, release it as finished bubbles.
 *
 * The upstream reveal paces characters so the text appears to be written. This
 * fork does the opposite: nothing appears until a block is complete, and then it
 * arrives whole. That is a rendering decision only — the deltas still arrive, the
 * store still holds the full message, and copy/selection/find all see the same
 * text they always did.
 *
 * Two effects keep it honest: a completed turn flushes the rest immediately (no
 * waiting on choreography), and a shrinking message — a rewind, a re-send —
 * resets the count instead of popping stale bubbles.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { completeBlocks, splitMessageBlocks } from "./blocks";
import { POP_INTERVAL_MS, planPops, type PopPlanItem } from "./pop-queue";
import { popSenses } from "./senses";

export interface PoppedBlocks {
  /** Bubbles to render, oldest first. */
  blocks: string[];
  /** The model is still working and the typing bubble belongs below the last block. */
  typing: boolean;
}

export function usePoppedBlocks(text: string, phase: "streaming" | "complete"): PoppedBlocks {
  const parsed = useMemo(() => splitMessageBlocks(text), [text]);
  const committed = useMemo(
    () => (phase === "complete" ? completeBlocks(parsed) : parsed.completed),
    [parsed, phase],
  );

  const shownRef = useRef<string[]>([]);
  const consumedRef = useRef(0);
  const queueRef = useRef<PopPlanItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useState(0);

  const commit = (items: readonly PopPlanItem[]) => {
    for (const item of items) {
      shownRef.current = [...shownRef.current, item.text];
      consumedRef.current += item.blocks;
    }
    forceRender((tick) => tick + 1);
  };

  useEffect(() => {
    // A message that shrank is a different message: drop what we showed.
    if (shownRef.current.length > 0 && committed.length < consumedRef.current) {
      shownRef.current = [];
      consumedRef.current = 0;
      queueRef.current = [];
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      forceRender((tick) => tick + 1);
      return;
    }

    const pending = committed.slice(consumedRef.current);
    if (pending.length === 0) return;

    if (phase === "complete") {
      // The turn is over: nobody should wait on the queue.
      commit(pending.map((block) => ({ text: block, blocks: 1 })));
      return;
    }

    queueRef.current = [...queueRef.current, ...planPops(pending)];
    if (timerRef.current !== null) return;

    const drain = () => {
      timerRef.current = null;
      const next = queueRef.current.shift();
      if (!next) return;
      commit([next]);
      popSenses();
      timerRef.current = setTimeout(drain, POP_INTERVAL_MS);
    };
    drain();
  }, [committed, phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  return { blocks: shownRef.current, typing: phase === "streaming" };
}
