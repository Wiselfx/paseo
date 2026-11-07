/**
 * Claude-style mascot level signals, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/mascot/mascot-signals.ts`.
 *
 * The web skin reads three host services: session status (`running`,
 * `pendingInteraction`), the session list (top-level vs subagents, crowd
 * size) and the chat snapshot (turn phase: `thinking` vs `working`).
 * Priorities are the source's: idle 1, thinking 2, working 3 (tiered by
 * crowd size — 1: `typing`, 2: `music`, 3+: `building`), juggling 4,
 * compacting 6, notification 7.
 *
 * This module is pure: it takes a reading and returns a level. The host
 * (Paseo) supplies the reading from its own session/turn state.
 */

import type { MascotLevel } from "./mascot-stage";

const IDLE: MascotLevel = { state: "idle", animation: "idle", priority: 1 };
const THINKING: MascotLevel = { state: "thinking", animation: "thinking", priority: 2 };
const NOTIFICATION: MascotLevel = { state: "notification", animation: "notification", priority: 7 };
const SWEEPING: MascotLevel = { state: "compacting", animation: "compacting", priority: 6 };

/** One working animation per crowd size, as Clawd's working tiers pick them. */
export function workingLevel(busy: number): MascotLevel {
  let animation = "typing";
  if (busy >= 3) animation = "building";
  else if (busy === 2) animation = "music";
  return { state: "working", animation, priority: 3 };
}

/** What the mascot reads. Paseo maps its session list + turn phase onto this. */
export interface MascotReading {
  /** The session on its conversation page, or null for the whole workspace. */
  sessionId: string | null;
  /** This session runs (live status first, list summary behind it). */
  running: boolean;
  /** A session interaction pending (approval, question, plan review). */
  pendingInteraction: boolean;
  /** A subagent of the followed session waits on the reader. */
  subagentPendingInteraction: boolean;
  /** Count of top-level sessions running right now, across the workspace. */
  busySessions: number;
  /** Subagents of the followed session that are running. */
  juggling: number;
  /** Whether a compaction of the followed session runs. */
  compacting: boolean;
  /** The followed session's open turn phase; null when none is open. */
  phase: "thinking" | "working" | null;
}

/**
 * The state to show: for one session on its conversation page, or for the
 * whole workspace on the home page. The reader is asked first (an interaction
 * the session, or one of its subagents, waits on), then a compaction, the
 * subagents at work, the turn's own phase and last whether the session runs.
 */
export function mascotLevel(reading: MascotReading): MascotLevel {
  const { sessionId } = reading;
  if (sessionId === null) {
    if (reading.pendingInteraction) return NOTIFICATION;
    return reading.busySessions > 0 ? workingLevel(reading.busySessions) : IDLE;
  }
  if (reading.pendingInteraction || reading.subagentPendingInteraction) return NOTIFICATION;
  if (reading.compacting) return SWEEPING;
  if (reading.juggling > 0) {
    return {
      state: "juggling",
      animation: reading.juggling >= 2 ? "conducting" : "music",
      priority: 4,
    };
  }
  if (reading.phase === "working") return workingLevel(Math.max(1, reading.busySessions));
  if (reading.phase === "thinking" || reading.running) return THINKING;
  return IDLE;
}
