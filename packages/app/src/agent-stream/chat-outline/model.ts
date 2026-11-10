import type { AgentTimelinePromptIndexPayload } from "@getpaseo/client/internal/daemon-client";

export type ChatOutlinePrompt = AgentTimelinePromptIndexPayload["prompts"][number];

export function shouldAcceptPromptIndexEpoch(timelineEpoch: string, indexEpoch: string): boolean {
  return timelineEpoch === indexEpoch;
}

/**
 * Ticks within this many slots of the pointer form the hovered neighbourhood, so a
 * sweep along the rail inks a local band instead of the whole column.
 */
export const OUTLINE_NEIGHBORHOOD_RADIUS = 3;

export function isOutlineNeighborhood(slotDistance: number): boolean {
  return Number.isFinite(slotDistance) && Math.abs(slotDistance) < OUTLINE_NEIGHBORHOOD_RADIUS;
}

/**
 * The prompt whose turn the reader is inside: the last indexed prompt at or before the
 * timeline position under the top of the viewport. It reads the complete daemon index,
 * so a prompt outside the loaded window still lights up while its turn is on screen.
 */
export function resolveActivePromptSeq(
  prompts: readonly ChatOutlinePrompt[],
  anchorSeq: number | null,
): number | null {
  if (anchorSeq === null) {
    return null;
  }
  let activeSeq: number | null = null;
  for (const prompt of prompts) {
    if (prompt.seq > anchorSeq) {
      break;
    }
    activeSeq = prompt.seq;
  }
  return activeSeq;
}

export interface ActivePromptSource {
  subscribe: (listener: () => void) => () => void;
  getActiveSeq: () => number | null;
}

export interface ActivePromptPublisher extends ActivePromptSource {
  publish: (seq: number | null) => void;
}

/**
 * The transcript reports its reading position on every scroll frame, far more often than
 * it re-renders. Keeping the active prompt outside React lets the rail subscribe to it
 * without dragging the transcript through a render on each frame.
 */
export function createActivePromptPublisher(): ActivePromptPublisher {
  const listeners = new Set<() => void>();
  let activeSeq: number | null = null;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getActiveSeq: () => activeSeq,
    publish(seq) {
      if (seq === activeSeq) {
        return;
      }
      activeSeq = seq;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}
