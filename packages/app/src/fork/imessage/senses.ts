/**
 * Fork (imessage): the two things the chat says out loud.
 *
 * The bubble hides the work on purpose, so sound and touch are the only signals
 * that anything is happening. Two verbs, deliberately different:
 *
 * - `tick`  — still working (fires under the typing bubble, irregularly)
 * - `pop`   — a bubble just arrived
 *
 * Both are rationed. The first draft fired a haptic on every tick, four times a
 * second, which stops reading as "working" and starts reading as a fault. Touch
 * now speaks at the *edges* of an event: a tick haptic at most every ~1.5s, and
 * only the first pop of a burst gets one. Sound stays continuous, because a tick
 * you can hear is not the same as a phone buzzing in your hand.
 *
 * Sound is best-effort. Placeholder WAVs ship in `assets/fork/` and are named by
 * verb, so swapping in a different set is a file replacement — no call site
 * knows anything about the samples.
 */
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const TICK_SAMPLE = require("../../../assets/fork/tick.wav") as number;
const POP_SAMPLE = require("../../../assets/fork/pop.wav") as number;

/** Pops closer together than this are one burst: one haptic, quieter sound. */
const POP_BURST_MS = 400;
/** Minimum gap between tick haptics. Jittered so it never becomes a metronome. */
const TICK_HAPTIC_MIN_MS = 1300;
const TICK_HAPTIC_JITTER_MS = 700;

const players = new Map<number, AudioPlayer>();
let soundEnabled = true;
let lastPopAt = 0;
let nextTickHapticAt = 0;

function playerFor(sample: number): AudioPlayer | null {
  const existing = players.get(sample);
  if (existing) return existing;
  try {
    const player = createAudioPlayer(sample, { keepAudioSessionActive: false });
    players.set(sample, player);
    return player;
  } catch {
    // A missing platform audio backend must never break the chat.
    return null;
  }
}

function play(sample: number, volume: number): void {
  if (!soundEnabled) return;
  const player = playerFor(sample);
  if (!player) return;
  try {
    player.volume = volume;
    // Rewind instead of allocating: a pop is ~100ms, so the previous one is long gone.
    void player.seekTo(0).then(() => player.play());
  } catch {
    /* sound is decoration; a failure here is silent by definition */
  }
}

function haptic(style: Haptics.ImpactFeedbackStyle): void {
  // expo-haptics is a no-op on web, but it throws on some desktop runtimes.
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

export interface PopSensesOptions {
  /** Force the "first of a burst" treatment; otherwise it is inferred from timing. */
  first?: boolean;
}

/** A bubble arrived. */
export function popSenses(options: PopSensesOptions = {}): void {
  const now = Date.now();
  const first = options.first ?? now - lastPopAt > POP_BURST_MS;
  lastPopAt = now;
  play(POP_SAMPLE, first ? 1 : 0.45);
  if (!first) return;
  haptic(Haptics.ImpactFeedbackStyle.Soft);
  // The burst is loud enough; let the next tick haptic wait its turn.
  nextTickHapticAt = now + TICK_HAPTIC_MIN_MS;
}

/** Still working. Sound every time, touch only occasionally. */
export function tickSenses(): void {
  play(TICK_SAMPLE, 0.4);
  const now = Date.now();
  if (now < nextTickHapticAt) return;
  nextTickHapticAt =
    now + TICK_HAPTIC_MIN_MS + Math.random() * TICK_HAPTIC_JITTER_MS;
  haptic(Haptics.ImpactFeedbackStyle.Light);
}

/** The composer sent something. */
export function sendSenses(): void {
  play(POP_SAMPLE, 0.7);
  haptic(Haptics.ImpactFeedbackStyle.Medium);
  lastPopAt = Date.now();
}

/** A bubble was picked up: the smallest possible "this is an object" cue. */
export function touchSenses(): void {
  haptic(Haptics.ImpactFeedbackStyle.Soft);
}

export function setForkSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}
