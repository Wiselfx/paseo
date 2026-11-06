/**
 * Fork (imessage): whether the turn's hidden work — reasoning and tool calls — is showing.
 *
 * Messages shows a typing balloon and nothing else while the other side works. The vision doc
 * takes that literally: the transcript hides the work behind the balloon, and opening it is a
 * deliberate act, because a wall of tool rows is the single least Messages-looking thing about
 * an agent transcript.
 *
 * What must *not* hide is anything that needs a person: a failed tool, an approval, a question.
 * Those are checked where the decision is made (`shouldRevealWork` in `agent-stream/view.tsx`)
 * rather than here, because only the stream knows what a row means.
 *
 * A store rather than context because the balloon lives in the assistant body and the rows live
 * in the stream, which are siblings under different providers.
 */
import { useSyncExternalStore } from "react";

let visible = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setWorkVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  emit();
}

export function toggleWorkVisible(): void {
  setWorkVisible(!visible);
}

/** True while the reader has asked to see the reasoning and tool rows. */
export function isWorkVisible(): boolean {
  return visible;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkVisible(): boolean {
  return useSyncExternalStore(subscribe, isWorkVisible, () => false);
}
