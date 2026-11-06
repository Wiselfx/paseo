/**
 * Fork (imessage): tapbacks, held for the session.
 *
 * Messages has a real reaction model on the server; Paseo's transcript does not, so this is
 * the client half of one. It is deliberately a store rather than component state: a bubble,
 * the long-press overlay and the details popover all read the same reaction, and applying one
 * has to repaint the bubble behind the overlay before the overlay finishes closing.
 *
 * When the daemon grows reactions, this file becomes the adapter and nothing else changes.
 */
import { useSyncExternalStore } from "react";

import type { TapbackSelection } from "./tapback-bar";

export type Reaction = TapbackSelection;

const reactions = new Map<string, Reaction>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function setReaction(key: string, reaction: Reaction | null): void {
  if (reaction) reactions.set(key, reaction);
  else reactions.delete(key);
  emit();
}

export function getReaction(key: string): Reaction | undefined {
  return reactions.get(key);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReaction(key: string | undefined): Reaction | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (key ? reactions.get(key) : undefined),
    () => undefined,
  );
}
