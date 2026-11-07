/**
 * Claude-style mascot stage machine, reimplemented from `dsh-claude-style`.
 *
 * Source: `packages/client/src/features/mascot/mascot-stage.ts`.
 *
 * The web skin keeps the decisions apart from the player so they run on a
 * plain object and a clock: the player owns the nodes, the animations and
 * the one timer, and asks these functions what to do. This is that same
 * separation in React Native — no DOM, no WAAPI, just data.
 *
 * Constants (from `mascot-stage.ts`):
 * - `MIN_SHOW_MS = 1000` — a state that just arrived is not pushed off by an
 *   equal or lower one within a second, so thinking and typing do not flicker.
 * - `SLEEP_AFTER_MS = 60000` — the quiet spell before the mascot dozes off.
 * - `EXTRA_MIN_MS / EXTRA_SPAN_MS = 20000` — the quiet spell between idle extras.
 * - Moments hold for two rounds of their animation: `error` 4800ms,
 *   `attention` 5200ms. A moment outranks the level on screen; a lesser one
 *   queues behind it.
 */

export type PlayMode = "loop" | "once";

export interface MascotLevel {
  state: string;
  animation: string;
  priority: number;
}

export type MascotMomentName = "error" | "attention";

export interface MascotMoment extends MascotLevel {
  holdMs: number;
}

export interface MascotPick {
  key: string;
  mode: PlayMode;
  priority: number;
}

export interface MascotStage {
  moment: (MascotLevel & { until: number }) | null;
  queued: MascotMomentName | null;
  reaction: { key: string; mode: PlayMode; fresh: boolean } | null;
  extra: string | null;
  waking: boolean;
  asleep: boolean;
  quietSince: number;
  nextExtraAt: number;
  current: (MascotPick & { start: number; done?: boolean }) | null;
}

export interface StageSurroundings {
  extras: readonly string[];
  extrasAllowed: boolean;
  random: () => number;
}

/** A state that just took the stage holds it this long against an equal or lower one. */
export const MASCOT_MIN_SHOW_MS = 1000;
/** The quiet spell before the mascot dozes off. */
export const MASCOT_SLEEP_AFTER_MS = 60000;
/** The quiet spell between two idle extras. */
export const MASCOT_EXTRA_MIN_MS = 20000;
export const MASCOT_EXTRA_SPAN_MS = 20000;
/** Moments hold for two rounds of their animation. */
export const MASCOT_MOMENTS: Record<MascotMomentName, MascotMoment> = {
  error: { state: "error", animation: "error", priority: 8, holdMs: 4800 },
  attention: { state: "attention", animation: "happy", priority: 5, holdMs: 5200 },
} as const;
/** A reaction outranks every state: it answers the reader's own hand. */
export const MASCOT_REACTION_PRIORITY = 10;

/** One object for everything the mascot does on a page, replaced whole. */
export function freshMascotStage(now: number): MascotStage {
  return {
    moment: null,
    queued: null,
    reaction: null,
    extra: null,
    waking: false,
    asleep: false,
    quietSince: now,
    nextExtraAt: 0,
    current: null,
  };
}

function startMoment(stage: MascotStage, name: MascotMomentName, now: number): void {
  const next = MASCOT_MOMENTS[name];
  stage.moment = { state: next.state, animation: next.animation, priority: next.priority, until: now + next.holdMs };
}

/**
 * A moment happened. One that outranks the moment on screen (or equals it)
 * takes over now; a lesser one waits its turn.
 *
 * @returns whether the moment took the stage now.
 */
export function takeMoment(stage: MascotStage, name: MascotMomentName, now: number): boolean {
  if (stage.moment !== null && now < stage.moment.until && stage.moment.priority > MASCOT_MOMENTS[name].priority) {
    stage.queued = name;
    return false;
  }
  startMoment(stage, name, now);
  return true;
}

/** What should be on screen now, given the level the signals read. */
export function decideStage(
  stage: MascotStage,
  now: number,
  level: MascotLevel,
  around: StageSurroundings,
): MascotPick {
  if (stage.moment !== null && now >= stage.moment.until) {
    stage.moment = null;
    if (stage.queued !== null) startMoment(stage, stage.queued, now);
    stage.queued = null;
  }
  if (stage.reaction !== null) {
    return { key: stage.reaction.key, mode: stage.reaction.mode, priority: MASCOT_REACTION_PRIORITY };
  }
  const held = stage.moment;
  const pick = held !== null && held.priority >= level.priority ? held : level;
  if (pick.state !== "idle") {
    stage.asleep = false;
    stage.waking = false;
    stage.extra = null;
    stage.nextExtraAt = 0;
    // Work on screen is no quiet spell: the minute to sleep starts when it ends.
    stage.quietSince = now;
    return { key: pick.animation, mode: "loop", priority: pick.priority };
  }
  if (!stage.asleep && now - stage.quietSince >= MASCOT_SLEEP_AFTER_MS) {
    stage.asleep = true;
    stage.extra = null;
  }
  if (stage.asleep) return { key: "sleeping", mode: "loop", priority: 1 };
  if (stage.waking) return { key: "waking", mode: "once", priority: 1 };
  if (stage.extra === null && around.extrasAllowed) {
    if (stage.nextExtraAt === 0) {
      stage.nextExtraAt = now + MASCOT_EXTRA_MIN_MS + around.random() * MASCOT_EXTRA_SPAN_MS;
    } else if (now >= stage.nextExtraAt) {
      stage.extra = around.extras[Math.floor(around.random() * around.extras.length)] ?? around.extras[0] ?? null;
    }
  }
  if (stage.extra !== null) return { key: stage.extra, mode: "once", priority: 1 };
  return { key: "idle", mode: "loop", priority: 1 };
}

/** A once animation reached its last frame: whoever asked for it lets go. */
export function finishStage(stage: MascotStage, key: string, now: number, random: () => number): void {
  // A fresh reaction has not played yet: the one ending is its predecessor.
  if (stage.reaction !== null && stage.reaction.key === key && !stage.reaction.fresh) {
    stage.reaction = null;
  }
  if (stage.extra === key) {
    stage.extra = null;
    stage.nextExtraAt = now + MASCOT_EXTRA_MIN_MS + random() * MASCOT_EXTRA_SPAN_MS;
  }
  if (key === "waking") stage.waking = false;
}

/**
 * Whether the animation on screen may give way to `next` now. A state that
 * just arrived is not pushed off by an equal or lower one within MIN_SHOW_MS,
 * so thinking and typing do not flicker; a once animation and a reaction give
 * way the moment something else is asked for.
 */
export function switchSettles(stage: MascotStage, next: MascotPick, now: number): boolean {
  const current = stage.current;
  return (
    current === null ||
    current.mode !== "loop" ||
    current.priority === MASCOT_REACTION_PRIORITY ||
    next.priority > current.priority ||
    now - current.start >= MASCOT_MIN_SHOW_MS
  );
}

/**
 * The next moment a time-based decision can flip — a moment's hold ending, a
 * deferred switch settling, a once animation's last frame, the quiet minute
 * to sleep, the next idle extra — or Infinity when none waits.
 */
export function nextDecisionAt(
  stage: MascotStage,
  now: number,
  waitSettle: boolean,
  playMs: (key: string) => number,
  level: MascotLevel | null,
): number {
  let at = Number.POSITIVE_INFINITY;
  if (stage.moment !== null) at = Math.min(at, stage.moment.until);
  if (waitSettle && stage.current !== null) at = Math.min(at, stage.current.start + MASCOT_MIN_SHOW_MS);
  if (stage.current !== null && stage.current.mode === "once" && stage.current.done !== true) {
    at = Math.min(at, stage.current.start + playMs(stage.current.key));
  }
  if (!stage.asleep && level !== null && level.state === "idle") {
    at = Math.min(at, stage.quietSince + MASCOT_SLEEP_AFTER_MS);
  }
  if (stage.extra === null && stage.nextExtraAt > now) at = Math.min(at, stage.nextExtraAt);
  return at;
}
